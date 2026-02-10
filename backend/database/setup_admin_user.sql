-- =========================================
-- Setup Supabase-Auth -> public.users Sync
-- Run this in Supabase SQL Editor
--
-- Why this exists:
-- - This project uses Supabase Auth (auth.users) for login/signup.
-- - The app also uses a public.users table (created by backend/database/schema.sql)
--   for roles, progress, bookmarks, etc.
-- - If a Supabase auth user exists but no row exists in public.users, calls like:
--     supabase.from('users').select(...).single()
--   fail with 406 / PGRST116 (0 rows).
-- =========================================

-- Change this to your admin email (case-insensitive match)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        RAISE EXCEPTION 'public.users table not found. Run backend/database/schema.sql first.';
    END IF;
END $$;

-- Ensure "name" column exists (older schema.sql doesn't have it)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'users'
          AND column_name  = 'name'
    ) THEN
        ALTER TABLE public.users ADD COLUMN name TEXT;
    END IF;
END $$;

-- Optional (recommended): link app users to auth.users via a FK when possible
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_id_auth_fk'
    ) THEN
        ALTER TABLE public.users
            ADD CONSTRAINT users_id_auth_fk
            FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Enable RLS + allow users to read/update only their own row
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_read_own ON public.users;
CREATE POLICY users_read_own ON public.users
    FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_update_own ON public.users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Make sure authenticated users can select/update; RLS still applies
GRANT SELECT, UPDATE ON public.users TO authenticated;

-- Create/replace the trigger function to insert a matching public.users row on signup
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    admin_email TEXT := 'iamramanjot444@gmail.com';
    display_name TEXT;
BEGIN
    display_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'User');

    INSERT INTO public.users (
        id,
        email,
        password_hash,
        full_name,
        name,
        role,
        email_verified,
        is_active
    )
    VALUES (
        NEW.id,
        NEW.email,
        'SUPABASE_AUTH',
        display_name,
        display_name,
        CASE WHEN lower(NEW.email) = lower(admin_email) THEN 'admin' ELSE 'student' END,
        (NEW.email_confirmed_at IS NOT NULL),
        TRUE
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        name = EXCLUDED.name,
        email_verified = EXCLUDED.email_verified,
        is_active = TRUE,
        role = CASE
            WHEN lower(EXCLUDED.email) = lower(admin_email) THEN 'admin'
            ELSE public.users.role
        END,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_auth_user();

-- Backfill: create missing public.users rows for already-existing auth users
INSERT INTO public.users (
    id,
    email,
    password_hash,
    full_name,
    name,
    role,
    email_verified,
    is_active
)
SELECT
    au.id,
    au.email,
    'SUPABASE_AUTH',
    COALESCE(au.raw_user_meta_data->>'name', au.email, 'User'),
    COALESCE(au.raw_user_meta_data->>'name', au.email, 'User'),
    CASE WHEN lower(au.email) = lower('iamramanjot444@gmail.com') THEN 'admin' ELSE 'student' END,
    (au.email_confirmed_at IS NOT NULL),
    TRUE
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
WHERE u.id IS NULL;

-- Force admin role for your admin account (if it exists)
UPDATE public.users
SET role = 'admin', updated_at = NOW()
WHERE lower(email) = lower('iamramanjot444@gmail.com');

-- Verify admin user
SELECT id, email, full_name, role, is_active, created_at
FROM public.users
WHERE lower(email) = lower('iamramanjot444@gmail.com');
