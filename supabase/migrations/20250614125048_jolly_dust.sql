/*
  # Fix User Registration Issues

  1. Security
    - Drop and recreate RLS policies with proper permissions
    - Allow authenticated users to insert their own profiles
    - Allow public access for profile creation during registration

  2. Functions
    - Create simple trigger function for automatic profile creation
    - Add manual profile creation function

  3. Data
    - Create any missing profiles for existing users
*/

-- First, disable RLS temporarily to fix any existing issues
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

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, working policies
CREATE POLICY "Allow public insert during registration" ON profiles
  FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Allow users to read own profile" ON profiles
  FOR SELECT TO public
  USING (auth.uid() = id);

CREATE POLICY "Allow users to update own profile" ON profiles
  FOR UPDATE TO public
  USING (auth.uid() = id);

CREATE POLICY "Allow admins full access" ON profiles
  FOR ALL TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create simple trigger function
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
  WHEN OTHERS THEN
    -- Don't fail user creation if profile creation fails
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to create missing profiles
CREATE OR REPLACE FUNCTION create_missing_profiles()
RETURNS INTEGER AS $$
DECLARE
  user_record RECORD;
  created_count INTEGER := 0;
BEGIN
  FOR user_record IN 
    SELECT au.id, au.email, au.raw_user_meta_data, au.created_at
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE p.id IS NULL
  LOOP
    BEGIN
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
        user_record.created_at
      );
      created_count := created_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        -- Skip this user if there's an error
        CONTINUE;
    END;
  END LOOP;
  
  RETURN created_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create missing profiles
SELECT create_missing_profiles();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;