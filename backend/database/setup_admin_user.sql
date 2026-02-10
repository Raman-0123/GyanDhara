-- Setup Admin User for GyanDhara
-- Run this in Supabase SQL Editor

-- Step 1: Create users table if it doesn't exist (links to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 3: Create policy to allow users to read their own data
CREATE POLICY IF NOT EXISTS "Users can view own record"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

-- Step 4: Create policy to allow public read access (needed for admin checks)
CREATE POLICY IF NOT EXISTS "Public can read users"
    ON public.users FOR SELECT
    TO PUBLIC
    USING (true);

-- Step 5: Create policy to allow users to update their own data
CREATE POLICY IF NOT EXISTS "Users can update own record"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- Step 6: Function to automatically create user record on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'student')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create trigger to run function on new auth user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 8: Set your email as admin
-- First, check if admin user already exists in auth.users
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Try to find existing user
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'iamramanjot444@gmail.com';

    IF admin_user_id IS NOT NULL THEN
        -- User exists, update/insert into public.users
        INSERT INTO public.users (id, email, name, role)
        VALUES (
            admin_user_id,
            'iamramanjot444@gmail.com',
            'Admin User',
            'admin'
        )
        ON CONFLICT (id) DO UPDATE
        SET role = 'admin', name = 'Admin User';
        
        RAISE NOTICE 'Existing user set as admin: %', admin_user_id;
    ELSE
        RAISE NOTICE 'User iamramanjot444@gmail.com not found in auth.users. Please sign up first, then run this script again.';
    END IF;
END $$;

-- Step 9: Verify admin user
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.created_at
FROM public.users u
WHERE u.email = 'iamramanjot444@gmail.com';

-- Step 10: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Verification queries
-- List all users
SELECT id, email, name, role, created_at FROM public.users ORDER BY created_at DESC;

-- Count users by role
SELECT role, COUNT(*) FROM public.users GROUP BY role;
