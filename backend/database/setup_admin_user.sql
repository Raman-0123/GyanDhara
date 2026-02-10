
-- =========================================
-- Setup Admin User for GyanDhara
-- Run this in Supabase SQL Editor
-- =========================================

-- Note: On older deployments the users table may exist without the "name" column.
-- The block below will add it if missing to avoid 42703 errors.
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure legacy tables gain the name column if it was missing
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

-- Step 2: Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- =========================================
-- Step 3–5: RLS POLICIES (FIXED)
-- PostgreSQL DOES NOT support:
-- CREATE POLICY IF NOT EXISTS
-- =========================================

-- Users can read their own record
DROP POLICY IF EXISTS "Users can view own record" ON public.users;
CREATE POLICY "Users can view own record"
    ON public.users
    FOR SELECT
    USING (auth.uid() = id);

-- Public read (needed for admin checks)
DROP POLICY IF EXISTS "Public can read users" ON public.users;
CREATE POLICY "Public can read users"
    ON public.users
    FOR SELECT
    TO PUBLIC
    USING (true);

-- Users can update their own record
DROP POLICY IF EXISTS "Users can update own record" ON public.users;
CREATE POLICY "Users can update own record"
    ON public.users
    FOR UPDATE
    USING (auth.uid() = id);

-- =========================================
-- Step 6: Function to auto-create user on signup
-- =========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'student')
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- Step 7: Trigger on auth.users insert
-- =========================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- Step 8: Set YOUR email as admin
-- =========================================

DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'iamramanjot444@gmail.com';

    IF admin_user_id IS NOT NULL THEN
        INSERT INTO public.users (id, email, name, role)
        VALUES (
            admin_user_id,
            'iamramanjot444@gmail.com',
            'Admin User',
            'admin'
        )
        ON CONFLICT (id) DO UPDATE
        SET role = 'admin',
            name = 'Admin User';

        RAISE NOTICE 'Admin user configured: %', admin_user_id;
    ELSE
        RAISE NOTICE 'User not found. Please sign up first, then rerun.';
    END IF;
END $$;

-- =========================================
-- Step 9: Verify admin user
-- =========================================

SELECT 
    id,
    email,
    name,
    role,
    created_at
FROM public.users
WHERE email = 'iamramanjot444@gmail.com';

-- =========================================
-- Step 10: Indexes for performance
-- =========================================

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- =========================================
-- Verification Queries
-- =========================================

-- List all users
SELECT id, email, name, role, created_at
FROM public.users
ORDER BY created_at DESC;

-- Count users by role
SELECT role, COUNT(*)
FROM public.users
GROUP BY role;
