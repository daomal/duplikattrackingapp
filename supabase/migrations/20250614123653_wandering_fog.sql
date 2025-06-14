/*
  # Fix Profile RLS Policies

  1. Security Updates
    - Add INSERT policy for users to create their own profiles
    - Ensure proper SELECT policy for users to read their own profiles
    - Add UPDATE policy for users to modify their own profiles

  2. Changes
    - Allow authenticated users to insert their own profile record
    - Maintain existing admin permissions
    - Fix policy conflicts that prevent profile creation
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Recreate the SELECT policy for users to read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create INSERT policy for users to create their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create UPDATE policy for users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);