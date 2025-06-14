-- Complete fix for authentication and profile system

-- First, disable RLS to clean up
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to read their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow admins full access" ON profiles;
DROP POLICY IF EXISTS "Allow anonymous read access" ON profiles;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "Enable select for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "Enable all for admins" ON profiles;

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS create_user_profile(uuid, text, user_role);
DROP FUNCTION IF EXISTS create_user_profile(uuid, text, text);
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS create_missing_profiles();
DROP FUNCTION IF EXISTS is_admin();

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the main function for creating user profiles
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id uuid,
  user_name text DEFAULT 'User',
  user_role text DEFAULT 'user'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  final_role user_role;
BEGIN
  -- Validate role
  IF user_role = 'admin' THEN
    final_role := 'admin'::user_role;
  ELSE
    final_role := 'user'::user_role;
  END IF;

  -- Insert or update the profile
  INSERT INTO public.profiles (id, name, role, created_at)
  VALUES (user_id, user_name, final_role, NOW())
  ON CONFLICT (id) 
  DO UPDATE SET 
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    created_at = COALESCE(profiles.created_at, NOW());

  -- Return the created/updated profile
  SELECT json_build_object(
    'id', id,
    'name', name,
    'role', role,
    'created_at', created_at
  ) INTO result
  FROM public.profiles
  WHERE id = user_id;

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create profile: %', SQLERRM;
END;
$$;

-- Create trigger function for new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_name text;
BEGIN
  -- Extract name from metadata
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1),
    'User'
  );

  -- Create profile using the function
  PERFORM create_user_profile(NEW.id, user_name, 'user');
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log warning but don't fail user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION handle_new_user();

-- Function to create missing profiles for existing users
CREATE OR REPLACE FUNCTION create_missing_profiles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  created_count integer := 0;
  user_name text;
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
    user_name := COALESCE(
      user_record.raw_user_meta_data->>'name',
      user_record.raw_user_meta_data->>'full_name',
      split_part(user_record.email, '@', 1),
      'User'
    );

    PERFORM create_user_profile(user_record.id, user_name, 'user');
    created_count := created_count + 1;
  END LOOP;
  
  RETURN created_count;
END;
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$;

-- Run the function to create missing profiles
SELECT create_missing_profiles();

-- Create comprehensive RLS policies

-- Policy for inserting profiles (allows users to create their own profile)
CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy for selecting profiles (users can read their own, admins can read all)
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT 
  TO authenticated
  USING (
    auth.uid() = id 
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Policy for updating profiles (users can update their own, admins can update all)
CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE 
  TO authenticated
  USING (
    auth.uid() = id 
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = id 
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Policy for deleting profiles (only admins can delete)
CREATE POLICY "profiles_delete_policy" ON profiles
  FOR DELETE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Allow anonymous users to read profiles (for public data)
CREATE POLICY "profiles_anonymous_select" ON profiles
  FOR SELECT 
  TO anon
  USING (true);

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON TABLE profiles TO authenticated;
GRANT SELECT ON TABLE profiles TO anon;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION create_user_profile(uuid, text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION create_missing_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- Ensure all existing users have profiles
SELECT create_missing_profiles();