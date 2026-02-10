const { createClient } = require('@supabase/supabase-js');

// Accept common env variants to be resilient to naming mismatches on Vercel
const SUPABASE_URL =
    process.env.SUPABASE_URL ||
    process.env.supabaseUrl; // some deployments used lowercase

const SUPABASE_ANON_KEY =
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY;

const SUPABASE_SERVICE_ROLE =
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_KEY; // some deployments used SERVICE_KEY

if (!SUPABASE_URL) {
    console.warn('⚠️  SUPABASE_URL is not set. Supabase client will not function correctly.');
}

const key = SUPABASE_SERVICE_ROLE || SUPABASE_ANON_KEY;
if (!SUPABASE_SERVICE_ROLE) {
    console.warn('ℹ️  Using anon key (SUPABASE_KEY). For privileged server access, set SUPABASE_SERVICE_ROLE.');
}

const supabase = createClient(SUPABASE_URL, key);

module.exports = { supabase };
