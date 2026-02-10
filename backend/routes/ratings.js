const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

/**
 * POST /api/ratings
 * Add or update rating for a topic
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { topicId, rating, comment } = req.body;

        if (!topicId || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Invalid rating data' });
        }

        // Check if user already rated this topic
        const { data: existing } = await supabase
            .from('ratings')
            .select('id')
            .eq('user_id', req.user.id)
            .eq('topic_id', topicId)
            .single();

        if (existing) {
            // Update existing rating
            const { error } = await supabase
                .from('ratings')
                .update({ rating, comment, updated_at: new Date().toISOString() })
                .eq('id', existing.id);

            if (error) throw error;
        } else {
            // Insert new rating
            const { error } = await supabase
                .from('ratings')
                .insert({
                    user_id: req.user.id,
                    topic_id: topicId,
                    rating,
                    comment
                });

            if (error) throw error;
        }

        // Update topic average rating
        const { data: ratings } = await supabase
            .from('ratings')
            .select('rating')
            .eq('topic_id', topicId);

        if (ratings && ratings.length > 0) {
            const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

            await supabase
                .from('topics')
                .update({
                    avg_rating: avgRating,
                    total_ratings: ratings.length
                })
                .eq('id', topicId);
        }

        res.json({ success: true, message: 'Rating saved' });

    } catch (error) {
        console.error('Rating error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/ratings/topic/:topicId
 * Get all ratings for a topic
 */
router.get('/topic/:topicId', optionalAuth, async (req, res) => {
    try {
        const { topicId } = req.params;

        const { data: ratings, error } = await supabase
            .from('ratings')
            .select(`
                *,
                users (full_name)
            `)
            .eq('topic_id', topicId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const formattedRatings = ratings.map(r => ({
            ...r,
            user_name: r.users?.full_name || 'Anonymous'
        }));

        res.json({ ratings: formattedRatings });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
