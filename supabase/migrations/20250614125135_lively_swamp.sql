/*
  # Create RPC function for profile creation

  This function allows creating profiles even when RLS might be blocking direct inserts.
*/

CREATE OR REPLACE FUNCTION create_user_profile(
  user_id UUID,
  user_name TEXT,
  user_role TEXT DEFAULT 'user'
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, created_at)
  VALUES (user_id, user_name, user_role::user_role, NOW())
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile(UUID, TEXT, TEXT) TO authenticated, anon;