/*
  # Complete Cargo Tracking Database Setup

  1. Database Schema
    - Create user_role enum
    - Create/update profiles table
    - Create/update shipments table with GPS tracking
    - Create status_history table
    - Create notes table

  2. Security
    - Enable RLS on all tables
    - Create comprehensive policies for admin/user access
    - Public read access for shipments

  3. Functions and Triggers
    - Auto-create profiles for new users
    - Track status changes automatically
    - Helper functions for admin operations
*/

-- 1. Create ENUM for user roles if not exists
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create profiles table if not exists
CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name text,
    role user_role DEFAULT 'user',
    created_at timestamptz DEFAULT now()
);

-- Add missing columns to profiles if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE profiles ADD COLUMN role user_role DEFAULT 'user';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE profiles ADD COLUMN created_at timestamptz DEFAULT now();
    END IF;
END $$;

-- 3. Create shipments table if not exists with all required columns
CREATE TABLE IF NOT EXISTS shipments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    no_surat_jalan text NOT NULL,
    perusahaan text NOT NULL,
    tujuan text NOT NULL,
    supir text NOT NULL,
    tanggal_kirim date NOT NULL,
    tanggal_tiba date,
    waktu_tiba time,
    status text DEFAULT 'tertunda',
    kendala text,
    qty integer DEFAULT 0,
    driver_id uuid REFERENCES profiles(id),
    current_lat float8,
    current_lng float8,
    tracking_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id)
);

-- Add new columns to existing shipments table if they don't exist
DO $$
BEGIN
    -- Add driver_id column for proper user relation
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipments' AND column_name = 'driver_id'
    ) THEN
        ALTER TABLE shipments ADD COLUMN driver_id uuid REFERENCES profiles(id);
    END IF;
    
    -- Add GPS tracking columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipments' AND column_name = 'current_lat'
    ) THEN
        ALTER TABLE shipments ADD COLUMN current_lat float8;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipments' AND column_name = 'current_lng'
    ) THEN
        ALTER TABLE shipments ADD COLUMN current_lng float8;
    END IF;
    
    -- Add tracking URL column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipments' AND column_name = 'tracking_url'
    ) THEN
        ALTER TABLE shipments ADD COLUMN tracking_url text;
    END IF;
    
    -- Add updated_by column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipments' AND column_name = 'updated_by'
    ) THEN
        ALTER TABLE shipments ADD COLUMN updated_by uuid REFERENCES auth.users(id);
    END IF;
    
    -- Add updated_at column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipments' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE shipments ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
    
    -- Ensure proper defaults for existing columns
    ALTER TABLE shipments ALTER COLUMN status SET DEFAULT 'tertunda';
    ALTER TABLE shipments ALTER COLUMN qty SET DEFAULT 0;
    
    -- Set default for created_at if it doesn't have one
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipments' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE shipments ADD COLUMN created_at timestamptz DEFAULT now();
    END IF;
END $$;

-- 4. Create status_history table if not exists
CREATE TABLE IF NOT EXISTS status_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    previous_status text NOT NULL,
    new_status text NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- 5. Create notes table if not exists
CREATE TABLE IF NOT EXISTS notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    content text NOT NULL,
    author_name text DEFAULT 'Anonim',
    user_id uuid REFERENCES auth.users(id),
    image_url text,
    created_at timestamptz DEFAULT now()
);

-- 6. Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- 7. Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

DROP POLICY IF EXISTS "Admins can do everything with shipments" ON shipments;
DROP POLICY IF EXISTS "Drivers can read their shipments" ON shipments;
DROP POLICY IF EXISTS "Drivers can update their shipments" ON shipments;
DROP POLICY IF EXISTS "Public read access to shipments" ON shipments;

DROP POLICY IF EXISTS "Users can read status history" ON status_history;
DROP POLICY IF EXISTS "Admins can manage status history" ON status_history;

DROP POLICY IF EXISTS "Anyone can read notes" ON notes;
DROP POLICY IF EXISTS "Users can create notes" ON notes;
DROP POLICY IF EXISTS "Users can update own notes" ON notes;
DROP POLICY IF EXISTS "Admins can manage all notes" ON notes;

-- 8. Create comprehensive RLS policies

-- Profiles policies
CREATE POLICY "Users can read own profile"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update all profiles"
    ON profiles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Shipments policies
CREATE POLICY "Admins can do everything with shipments"
    ON shipments
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Drivers can read their shipments"
    ON shipments
    FOR SELECT
    TO authenticated
    USING (
        driver_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Drivers can update their shipments"
    ON shipments
    FOR UPDATE
    TO authenticated
    USING (
        driver_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Public read access for shipments (for public data page)
CREATE POLICY "Public read access to shipments"
    ON shipments
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Status history policies
CREATE POLICY "Users can read status history"
    ON status_history
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM shipments s 
            WHERE s.id = shipment_id 
            AND (s.driver_id = auth.uid() OR 
                 EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
        )
    );

CREATE POLICY "Admins can manage status history"
    ON status_history
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Notes policies
CREATE POLICY "Anyone can read notes"
    ON notes
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Users can create notes"
    ON notes
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can update own notes"
    ON notes
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all notes"
    ON notes
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 9. Create helper functions

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- Function to get company summaries
CREATE OR REPLACE FUNCTION get_company_summaries()
RETURNS TABLE (
    company text,
    total bigint,
    delivered bigint,
    pending bigint,
    failed bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        perusahaan as company,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'terkirim') as delivered,
        COUNT(*) FILTER (WHERE status = 'tertunda') as pending,
        COUNT(*) FILTER (WHERE status = 'gagal') as failed
    FROM shipments
    GROUP BY perusahaan
    ORDER BY total DESC;
$$;

-- 10. Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_shipments_driver_id ON shipments(driver_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_tanggal_kirim ON shipments(tanggal_kirim);
CREATE INDEX IF NOT EXISTS idx_shipments_perusahaan ON shipments(perusahaan);
CREATE INDEX IF NOT EXISTS idx_status_history_shipment_id ON status_history(shipment_id);
CREATE INDEX IF NOT EXISTS idx_status_history_created_at ON status_history(created_at);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);

-- 11. Create trigger to automatically create profile for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO profiles (id, name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        'user'
    );
    RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 12. Create trigger for status history tracking
CREATE OR REPLACE FUNCTION track_status_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only track if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO status_history (shipment_id, previous_status, new_status, created_by)
        VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
    END IF;
    RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_shipment_status_change ON shipments;
CREATE TRIGGER on_shipment_status_change
    AFTER UPDATE ON shipments
    FOR EACH ROW EXECUTE FUNCTION track_status_changes();

-- 13. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;