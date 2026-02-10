const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL) {
    console.warn('⚠️  SUPABASE_URL is not set. Supabase client will not function correctly.');
}

const key = SUPABASE_SERVICE_ROLE || SUPABASE_ANON_KEY;
if (!SUPABASE_SERVICE_ROLE) {
    console.warn('ℹ️  Using SUPABASE_KEY (anon). For server writes/updates, set SUPABASE_SERVICE_ROLE to bypass RLS.');
}

const supabase = createClient(SUPABASE_URL, key);

module.exports = { supabase };
