/*
  # Fix Profile Creation and RLS Issues

  1. Security Changes
    - Fix RLS policies for profile creation
    - Allow authenticated users to create their own profiles
    - Allow admins full access to all profiles
    - Allow anonymous read access for public data

  2. Functions
    - Improved handle_new_user trigger function
    - Manual profile creation function
    - Function to create missing profiles for existing users
    - Admin check function

  3. Data Fixes
    - Create profiles for existing users who don't have them
    - Proper error handling for profile creation
*/

-- First, disable RLS temporarily to fix existing data
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "Enable select for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "Enable all for admins" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS create_missing_profiles();
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS create_user_profile(UUID, TEXT, TEXT);

-- Create or replace the handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile for new user
  INSERT INTO public.profiles (id, name, role, created_at)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1),
      'User'
    ),
    'user',
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, that's fine
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to manually create profiles (with proper permissions)
CREATE FUNCTION create_user_profile(
  user_id UUID,
  user_name TEXT DEFAULT NULL,
  user_role TEXT DEFAULT 'user'
)
RETURNS void AS $$
DECLARE
  final_name TEXT;
  final_role user_role;
BEGIN
  -- Set default name if not provided
  final_name := COALESCE(user_name, 'User');
  
  -- Validate and set role
  final_role := CASE 
    WHEN user_role = 'admin' THEN 'admin'::user_role
    ELSE 'user'::user_role
  END;
  
  -- Insert or update profile
  INSERT INTO public.profiles (id, name, role, created_at)
  VALUES (user_id, final_name, final_role, NOW())
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    role = EXCLUDED.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to fix missing profiles for existing users
CREATE FUNCTION create_missing_profiles()
RETURNS INTEGER AS $$
DECLARE
  user_record RECORD;
  created_count INTEGER := 0;
BEGIN
  FOR user_record IN 
    SELECT 
      au.id, 
      au.email, 
      au.raw_user_meta_data,
      au.created_at
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE p.id IS NULL
  LOOP
    INSERT INTO public.profiles (id, name, role, created_at)
    VALUES (
      user_record.id,
      COALESCE(
        user_record.raw_user_meta_data->>'name',
        user_record.raw_user_meta_data->>'full_name',
        split_part(user_record.email, '@', 1),
        'User'
      ),
      'user',
      COALESCE(user_record.created_at, NOW())
    );
    
    created_count := created_count + 1;
  END LOOP;
  
  RETURN created_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user is admin (useful for RLS)
CREATE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the function to create missing profiles
SELECT create_missing_profiles();

-- Now create proper RLS policies
CREATE POLICY "Allow users to insert their own profile" ON profiles
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow users to read their own profile" ON profiles
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile" ON profiles
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin policies - admins can do everything
CREATE POLICY "Allow admins full access" ON profiles
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Allow anonymous users to read profiles (for public data)
CREATE POLICY "Allow anonymous read access" ON profiles
  FOR SELECT 
  TO anon
  USING (true);

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON TABLE profiles TO authenticated;
GRANT SELECT ON TABLE profiles TO anon;
GRANT EXECUTE ON FUNCTION create_user_profile(UUID, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION create_missing_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated, anon;