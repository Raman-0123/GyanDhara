const express = require('express');
const router = express.Router();
const { requireSupabase, supabaseConfig } = require('../lib/supabase');
const { optionalAuth } = require('../middleware/auth');
const { validateQuery, querySchemas } = require('../middleware/validator');
const { asyncHandler } = require('../middleware/errorHandler');

// Supabase client imported from shared lib (uses service role if provided)

/**
 * GET /api/topics/themes
 * Get all themes
 */
router.get('/themes', asyncHandler(async (req, res) => {
    try {
        const supabase = requireSupabase();
        const { data: themes, error } = await supabase
            .from('themes')
            .select('*')
            .eq('is_active', true)
            .order('display_order');

        if (error) throw error;

        res.json({
            themes,
            count: themes.length
        });
    } catch (error) {
        console.error('[/api/topics/themes] Supabase error:', error);
        return res.status(500).json({
            error: 'Failed to fetch themes',
            details: error.message,
            code: error.code,
            supabase: supabaseConfig
        });
    }
}));

/**
 * GET /api/topics
 * Get topics with filtering and pagination
 */
router.get('/', validateQuery(querySchemas.topicQuery), optionalAuth, asyncHandler(async (req, res) => {
    const supabase = requireSupabase();
    const { page, limit, theme, difficulty, language, search } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
        .from('topics')
        .select('id, title, summary, theme_name, difficulty_level, detected_language, view_count, created_at', { count: 'exact' })
        .eq('is_verified', true);

    // Apply filters
    if (theme) query = query.eq('theme_id', theme);
    if (difficulty) query = query.eq('difficulty_level', difficulty);
    if (language) query = query.eq('detected_language', language);
    if (search) query = query.ilike('title', `%${search}%`);

    // Pagination
    query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    const { data: topics, error, count } = await query;

    if (error) throw error;

    res.json({
        topics,
        pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil(count / limit)
        }
    });
}));

/**
 * GET /api/topics/:id
 * Get single topic with quiz and PDF info
 */
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
    const supabase = requireSupabase();
    const { id } = req.params;

    // Get topic
    const { data: topic, error: topicError } = await supabase
        .from('topics')
        .select('*')
        .eq('id', id)
        .single();

    if (topicError || !topic) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Topic not found'
        });
    }

    // Get quiz for this topic
    const { data: quiz } = await supabase
        .from('quizzes')
        .select('id, questions, generated_at, version')
        .eq('topic_id', id)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .single();

    // Increment view count
    await supabase
        .from('topics')
        .update({ view_count: (topic.view_count || 0) + 1 })
        .eq('id', id);

    res.json({
        ...topic,
        quiz,
        hasQuiz: !!quiz
    });
}));

/**
 * POST /api/topics
 * Create a new topic
 */
router.post('/', asyncHandler(async (req, res) => {
    const supabase = requireSupabase();
    const {
        theme_id,
        title,
        summary,
        difficulty_level = 'medium',
        detected_language = 'Punjabi',
        is_verified = true
    } = req.body;

    // Validate required fields
    if (!theme_id || !title || !summary) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'theme_id, title, and summary are required'
        });
    }

    // Get theme name
    const { data: theme } = await supabase
        .from('themes')
        .select('name')
        .eq('id', theme_id)
        .single();

    // Insert topic - only using columns that exist in the schema
    const { data: topic, error } = await supabase
        .from('topics')
        .insert({
            theme_id,
            theme_name: theme?.name || 'Unknown',
            title,
            summary,
            difficulty_level,
            detected_language,
            is_verified,
            view_count: 0,
            bookmark_count: 0
        })
        .select()
        .single();

    if (error) throw error;

    res.status(201).json({
        success: true,
        message: 'Topic created successfully',
        topic
    });
}));

/**
 * GET /api/topics/search
 * Full-text search across topics
 */
router.get('/search/:query', asyncHandler(async (req, res) => {
    const supabase = requireSupabase();
    const { query } = req.params;
    const { limit = 20 } = req.query;

    const { data: results, error } = await supabase
        .from('topics')
        .select('id, title, summary, theme_name, difficulty_level')
        .eq('is_verified', true)
        .or(`title.ilike.%${query}%,raw_text_clean.ilike.%${query}%`)
        .limit(limit);

    if (error) throw error;

    res.json({
        query,
        results,
        count: results.length
    });
}));

module.exports = router;
