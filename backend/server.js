const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Load environment variables from backend/.env when running locally.
// Vercel injects env vars directly, so this is a no-op in production.
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config(); // fallback to project root or already-set env vars
const { supabaseConfig, requireSupabase } = require('./lib/supabase');

// Import routes
const topicRoutes = require('./routes/topics');
const userRoutes = require('./routes/user');
const githubRoutes = require('./routes/github');
const githubReleasesRoutes = require('./routes/github-releases');
const uploadRoutes = require('./routes/upload');
const quizRoutes = require('./routes/quiz');
const ratingsRoutes = require('./routes/ratings');
const lessonsRoutes = require('./routes/lessons');
const translateRoutes = require('./routes/translate');
const booksRoutes = require('./routes/books');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_VERCEL = Boolean(process.env.VERCEL);
let server = null;

// Vercel rewrites can drop the "/api" prefix before requests hit Express.
// Normalize the path so existing routes keep working in all environments.
if (IS_VERCEL) {
    app.use((req, res, next) => {
        if (!req.url.startsWith('/api')) {
            req.url = `/api${req.url}`;
        }
        next();
    });
}

// Disable helmet completely for local development - PDFs need to be embedded
// app.use(helmet());

// CORS configuration
const allowedOrigins = (process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:8080',
        // Common IPv6 localhost forms used by some dev servers
        'http://[::1]:5173',
        'http://[::1]:5174',
        'http://[::1]:5175',
        'http://[::1]:8080',
        'http://[::]:8080',
        // Production domains
        'https://gyan-dhara-lms.vercel.app'
    ]
).map(origin => origin.trim());

// Auto-allow the current Vercel deployment URL without needing to hardcode it
if (process.env.VERCEL_URL) {
    const vercelOrigin = `https://${process.env.VERCEL_URL}`;
    if (!allowedOrigins.includes(vercelOrigin)) {
        allowedOrigins.push(vercelOrigin);
    }
}

function isAllowedOrigin(origin) {
    if (!origin) return true; // allow same-origin or non-browser clients
    if (allowedOrigins.includes(origin)) return true;

    // Allow any Vercel preview for this project
    if (origin.endsWith('.vercel.app') && origin.includes('gyan-dhara')) {
        return true;
    }

    // Check for any localhost/IPv6 format before URL parsing
    if (origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes('[::1]') ||
        origin.includes('[::]:')) {
        return true;
    }

    try {
        const url = new URL(origin);
        const host = url.hostname;
        // Allow any localhost/127.0.0.1 with any port
        if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '::') {
            return true;
        }
    } catch (e) {
        // URL parsing failed, already checked above
    }
    return false;
}

const corsOptions = {
    origin: (origin, callback) => {
        // Allow same-origin or tools like Thunder Client that omit the Origin header
        if (isAllowedOrigin(origin)) {
            return callback(null, true);
        }
        console.warn(`🚫 CORS blocked origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Serve uploaded PDFs statically (local storage access)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting (production only)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
if (process.env.NODE_ENV === 'production') {
    app.use('/api/', limiter);
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
    });
});

// Quick env check (safe: only shows presence, not values)
app.get('/api/env-check', (req, res) => {
    res.json({
        timestamp: new Date().toISOString(),
        vercel: Boolean(process.env.VERCEL),
        nodeEnv: process.env.NODE_ENV || 'not set',
        envVars: {
            SUPABASE_URL: process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL.substring(0, 30)}...` : 'NOT SET',
            SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE ? `present (${process.env.SUPABASE_SERVICE_ROLE.substring(0, 20)}...)` : 'NOT SET',
            SUPABASE_KEY: process.env.SUPABASE_KEY ? `present (${process.env.SUPABASE_KEY.substring(0, 20)}...)` : 'NOT SET',
            GITHUB_TOKEN: process.env.GITHUB_TOKEN ? 'present' : 'NOT SET',
            JWT_SECRET: process.env.JWT_SECRET ? 'present' : 'NOT SET',
        },
        supabaseConfig: requireSupabase ? supabaseConfig : 'not loaded'
    });
});

// Diagnostics (safe: does not return secrets). Useful for debugging Vercel env + Supabase connectivity.
app.get('/api/diag/supabase', async (req, res) => {
    try {
        const result = {
            timestamp: new Date().toISOString(),
            vercel: Boolean(process.env.VERCEL),
            nodeEnv: process.env.NODE_ENV || null,
            supabase: supabaseConfig,
            github: {
                hasToken: Boolean(process.env.GITHUB_TOKEN),
                hasOwner: Boolean(process.env.GITHUB_OWNER),
                hasRepo: Boolean(process.env.GITHUB_REPO),
            },
            tests: {}
        };

        // If we don't even have a URL or key, report and return early (don’t throw).
        if (!supabaseConfig.hasUrl || (!supabaseConfig.hasAnonKey && !supabaseConfig.hasServiceRoleKey)) {
            result.tests.supabase = {
                ok: false,
                error: { message: 'Missing SUPABASE_URL or keys in environment' }
            };
            return res.json(result);
        }

        try {
            const supabase = requireSupabase();

            const themes = await supabase.from('themes').select('id', { count: 'exact', head: true }).limit(1);
            result.tests.themes = themes.error
                ? { ok: false, error: { message: themes.error.message, code: themes.error.code } }
                : { ok: true, count: themes.count ?? null };

            const books = await supabase.from('topic_books').select('id', { count: 'exact', head: true }).limit(1);
            result.tests.topic_books = books.error
                ? { ok: false, error: { message: books.error.message, code: books.error.code } }
                : { ok: true, count: books.count ?? null };
        } catch (err) {
            result.tests.supabase = { ok: false, error: { message: err.message, code: err.code } };
        }

        return res.json(result);
    } catch (outerErr) {
        console.error('diag/supabase fatal error:', outerErr);
        return res.status(500).json({
            error: 'diag_failed',
            message: outerErr.message
        });
    }
});

// Very small sanity endpoint to confirm function boots
app.get('/api/diag/ping', (_req, res) => {
    res.json({ ok: true, timestamp: Date.now(), vercel: Boolean(process.env.VERCEL) });
});

// API Routes
app.use('/api/topics', topicRoutes);
app.use('/api/user', userRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/github-releases', githubReleasesRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/lessons', lessonsRoutes);
app.use('/api/translate', translateRoutes);
app.use('/api/books', booksRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: '🌊 GyanDhara API - Stream of Knowledge',
        version: '1.0.0',
        docs: '/api/docs',
        health: '/health'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.url} not found`
    });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server only in standalone mode (not in Vercel serverless)
if (!process.env.VERCEL) {
    server = app.listen(PORT, () => {
        console.log(`🌊 GyanDhara Backend running on port ${PORT}`);
        console.log(`📍 Environment: ${process.env.NODE_ENV}`);
        console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });
}

// Graceful shutdown
process.on('SIGTERM', () => {
    try {
        console.log('👋 SIGTERM signal received: closing HTTP server');
        if (server && typeof server.close === 'function') {
            server.close(() => {
                console.log('✅ HTTP server closed');
            });
        }
    } catch (err) {
        console.error('SIGTERM shutdown error:', err);
    }
});

module.exports = app;
