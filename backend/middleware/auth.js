const { requireSupabase, supabaseConfig } = require('../lib/supabase');

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'iamramanjot444@gmail.com').toLowerCase();

/**
 * Middleware to verify JWT token and authenticate user
 */
const authenticateToken = async (req, res, next) => {
    try {
        const supabase = requireSupabase();
        console.log('\n🔐 [AUTH] Authenticating request to:', req.method, req.path);
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            console.log('❌ [AUTH] No token provided');
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'No authentication token provided'
            });
        }

        console.log('🔑 [AUTH] Supabase JWT received:', token.substring(0, 20) + '...');

        // Ask Supabase to validate the access token and return the user
        const { data: authData, error: authError } = await supabase.auth.getUser(token);

        if (authError || !authData?.user) {
            console.error('❌ [AUTH] Supabase validation failed:', authError?.message);
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or expired token'
            });
        }

        const authUser = authData.user;
        console.log('✅ [AUTH] Supabase token valid for user:', authUser.email);

        // Fetch role/profile from public.users; create a row if it doesn't exist.
        let profile = null;
        let profileError = null;

        const profileResult = await supabase
            .from('users')
            .select('id, email, name, full_name, role, is_active')
            .eq('id', authUser.id)
            .limit(1);

        profileError = profileResult.error;
        profile = Array.isArray(profileResult.data) ? profileResult.data[0] : null;

        // Fallback for older schemas missing some columns
        if (profileError?.code === '42703') {
            const fallback = await supabase
                .from('users')
                .select('id, email, full_name, role, is_active')
                .eq('id', authUser.id)
                .limit(1);

            profileError = fallback.error;
            profile = Array.isArray(fallback.data) ? fallback.data[0] : null;
        }

        if (profileError) {
            console.error('❌ [AUTH] Database error:', profileError);
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'Authentication failed while fetching profile'
            });
        }

        if (!profile) {
            const displayName = authUser.user_metadata?.name || authUser.email || 'User';
            const derivedRole = (authUser.email || '').toLowerCase() === ADMIN_EMAIL ? 'admin' : 'student';

            console.warn('ℹ️  [AUTH] No public.users row found; creating one for', authUser.email);

            const insertPayload = {
                id: authUser.id,
                email: authUser.email,
                password_hash: 'SUPABASE_AUTH',
                full_name: displayName,
                role: derivedRole,
                is_active: true,
            };

            const { data: inserted, error: insertError } = await supabase
                .from('users')
                .insert(insertPayload)
                .select('id, email, name, full_name, role, is_active');

            if (insertError?.code === '42703') {
                // Older schema: omit "name" from select
                const retry = await supabase
                    .from('users')
                    .insert(insertPayload)
                    .select('id, email, full_name, role, is_active');

                if (retry.error) {
                    console.error('❌ [AUTH] Failed creating public.users row:', retry.error);
                } else {
                    profile = Array.isArray(retry.data) ? retry.data[0] : null;
                }
            } else if (insertError) {
                console.error('❌ [AUTH] Failed creating public.users row:', insertError);
            } else {
                profile = Array.isArray(inserted) ? inserted[0] : null;
            }
        }

        const mergedUser = {
            id: authUser.id,
            email: authUser.email,
            name: profile?.name || profile?.full_name || authUser.user_metadata?.name || authUser.email,
            // Never trust user_metadata for authorization decisions.
            role: profile?.role || ((authUser.email || '').toLowerCase() === ADMIN_EMAIL ? 'admin' : 'student'),
            is_active: profile?.is_active ?? true,
        };

        if (mergedUser.is_active === false) {
            console.log('❌ [AUTH] User account is inactive');
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Account has been deactivated'
            });
        }

        req.user = mergedUser;
        console.log('✅ [AUTH] Authentication successful for', mergedUser.email, 'Role:', mergedUser.role, '\n');
        next();
    } catch (error) {
        if (error?.code === 'SUPABASE_CONFIG') {
            console.error('[AUTH] Supabase env misconfigured:', supabaseConfig);
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'Server misconfigured: Supabase env vars missing/invalid'
            });
        }
        console.error('Auth middleware error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Authentication failed'
        });
    }
};

/**
 * Middleware to check if user has admin role
 */
const requireAdmin = (req, res, next) => {
    console.log('👑 [ADMIN] Checking admin privileges...');
    console.log('👤 [ADMIN] User:', req.user?.email);
    console.log('🎭 [ADMIN] Role:', req.user?.role);

    if (!req.user) {
        console.log('❌ [ADMIN] No user object found');
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required'
        });
    }

    if (req.user.role !== 'admin') {
        console.log('❌ [ADMIN] User is not an admin');
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Admin privileges required'
        });
    }

    console.log('✅ [ADMIN] Admin access granted\n');
    next();
};

/**
 * Optional authentication - doesn't fail if no token
 * Used for features that work better with user context but don't require it
 */
const optionalAuth = async (req, res, next) => {
    try {
        const supabase = requireSupabase();
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const { data: authData } = await supabase.auth.getUser(token);

            if (authData?.user) {
                const { data, error } = await supabase
                    .from('users')
                    .select('id, email, name, full_name, role, is_active')
                    .eq('id', authData.user.id)
                    .limit(1);

                const profile = !error && Array.isArray(data) ? data[0] : null;

                if (profile && profile.is_active !== false) {
                    req.user = {
                        ...profile,
                        name: profile.name || profile.full_name || authData.user.email,
                        role: profile.role || 'student'
                    };
                }
            }
        }

        next();
    } catch (error) {
        // Silently continue without user
        next();
    }
};

module.exports = {
    authenticateToken,
    requireAdmin,
    optionalAuth
};
