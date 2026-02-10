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

function decodeJwtRole(jwt) {
    try {
        if (!jwt || typeof jwt !== 'string') return null;
        const parts = jwt.split('.');
        if (parts.length < 2) return null;
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        return payload?.role || null;
    } catch {
        return null;
    }
}

const key = SUPABASE_SERVICE_ROLE || SUPABASE_ANON_KEY;

const supabaseConfig = {
    hasUrl: Boolean(SUPABASE_URL),
    hasAnonKey: Boolean(SUPABASE_ANON_KEY),
    hasServiceRoleKey: Boolean(SUPABASE_SERVICE_ROLE),
    effectiveKeyRole: decodeJwtRole(key),
};

if (!supabaseConfig.hasUrl) {
    console.warn('⚠️  SUPABASE_URL is not set. Supabase client will not function correctly.');
}
if (!supabaseConfig.hasAnonKey && !supabaseConfig.hasServiceRoleKey) {
    console.warn('⚠️  SUPABASE_KEY/SUPABASE_SERVICE_ROLE is not set. Supabase client will not function correctly.');
}
if (!supabaseConfig.hasServiceRoleKey) {
    console.warn('ℹ️  Using anon key (SUPABASE_KEY). For privileged server access, set SUPABASE_SERVICE_ROLE.');
}

let supabase = null;
function requireSupabase() {
    if (supabase) return supabase;
    const err = new Error(
        'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE (or SUPABASE_KEY for anon).'
    );
    err.code = 'SUPABASE_CONFIG';
    throw err;
}

if (supabaseConfig.hasUrl && key) {
    supabase = createClient(SUPABASE_URL, key);
}

module.exports = { supabase, supabaseConfig, requireSupabase };
