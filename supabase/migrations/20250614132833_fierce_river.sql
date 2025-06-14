/*
  # Create user profile RPC function and fix RLS policies

  1. New Functions
    - `create_user_profile` - RPC function to create user profiles safely
  
  2. Security Updates
    - Update RLS policies on profiles table to allow authenticated users to insert their own profiles
    - Ensure proper permissions for profile creation
  
  3. Changes
    - Add missing RPC function that the application expects
    - Fix INSERT policy for profiles table to allow authenticated users to create their own profiles
*/

-- Create the RPC function for creating user profiles
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id uuid,
  user_name text,
  user_role user_role DEFAULT 'user'::user_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert the user profile
  INSERT INTO profiles (id, name, role)
  VALUES (user_id, user_name, user_role)
  ON CONFLICT (id) 
  DO UPDATE SET 
    name = EXCLUDED.name,
    role = EXCLUDED.role;
END;
$$;

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON profiles;

-- Create a new INSERT policy that allows authenticated users to create their own profiles
CREATE POLICY "Enable insert for authenticated users"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Ensure the profiles table has RLS enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile(uuid, text, user_role) TO authenticated;