const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Use service key to bypass RLS for authentication checks
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

/**
 * Middleware to verify JWT token and authenticate user
 */
const authenticateToken = async (req, res, next) => {
    try {
        console.log('\n🔐 [AUTH] Authenticating request to:', req.method, req.path);
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            console.log('❌ [AUTH] No token provided');
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'No authentication token provided'
            });
        }

        console.log('🔑 [AUTH] Token received:', token.substring(0, 20) + '...');

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ [AUTH] Token decoded successfully');
        console.log('👤 [AUTH] User ID from token:', decoded.userId);
        console.log('📧 [AUTH] Email from token:', decoded.email);
        console.log('🎭 [AUTH] Role from token:', decoded.role);

        // Fetch user from database
        console.log('🔍 [AUTH] Fetching user from database...');
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, full_name, role, is_active')
            .eq('id', decoded.userId)
            .single();

        if (error) {
            console.error('❌ [AUTH] Database error:', error);
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or expired token'
            });
        }

        if (!user) {
            console.log('❌ [AUTH] User not found in database');
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or expired token'
            });
        }

        console.log('✅ [AUTH] User found:', user.email, 'Role:', user.role);

        if (!user.is_active) {
            console.log('❌ [AUTH] User account is inactive');
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Account has been deactivated'
            });
        }

        // Attach user to request object
        req.user = user;
        console.log('✅ [AUTH] Authentication successful\n');
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Token has expired'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid token'
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
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const { data: user, error } = await supabase
                .from('users')
                .select('id, email, full_name, role, is_active')
                .eq('id', decoded.userId)
                .single();

            if (!error && user && user.is_active) {
                req.user = user;
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
