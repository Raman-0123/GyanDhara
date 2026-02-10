const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireSupabase } = require('../lib/supabase');

/**
 * GET /api/user/profile
 * Get user profile
 */
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const supabase = requireSupabase();
  const userId = req.user.id;

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, profile_pic, preferred_language, learning_streak, total_learning_time, created_at, last_login')
    .eq('id', userId)
    .single();

  if (error) throw error;

  res.json({ user });
}));

/**
 * PUT /api/user/profile
 * Update user profile
 */
router.put('/profile', authenticateToken, validate('updateProfile'), asyncHandler(async (req, res) => {
  const supabase = requireSupabase();
  const userId = req.user.id;
  const { fullName, preferredLanguage, preferredTheme } = req.body;

  const updates = {};
  if (fullName) updates.full_name = fullName;
  if (preferredLanguage) updates.preferred_language = preferredLanguage;
  if (preferredTheme) updates.preferred_theme = preferredTheme;

  const { data: user, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;

  res.json({
    message: 'Profile updated successfully',
    user
  });
}));

/**
 * GET /api/user/progress
 * Get user learning progress and statistics
 */
router.get('/progress', authenticateToken, asyncHandler(async (req, res) => {
  const supabase = requireSupabase();
  const userId = req.user.id;

  // Get user stats
  const { data: user } = await supabase
    .from('users')
    .select('learning_streak, total_learning_time')
    .eq('id', userId)
    .single();

  // Get quiz statistics
  const { data: quizStats } = await supabase
    .from('user_progress')
    .select('score, total_questions, completed_at')
    .eq('user_id', userId);

  const totalQuizzes = quizStats?.length || 0;
  const averageScore = totalQuizzes > 0
    ? Math.round(quizStats.reduce((sum, q) => sum + q.score, 0) / totalQuizzes)
    : 0;

  // Get topics completed
  const { count: topicsCompleted } = await supabase
    .from('user_progress')
    .select('topic_id', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Get bookmarked topics count
  const { count: bookmarksCount } = await supabase
    .from('bookmarks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Get theme-wise progress
  const { data: themeProgress } = await supabase
    .from('user_progress')
    .select(`
      topics:topic_id (theme_name, theme_id)
    `)
    .eq('user_id', userId);

  const themeStats = {};
  themeProgress?.forEach(p => {
    const themeName = p.topics?.theme_name;
    if (themeName) {
      themeStats[themeName] = (themeStats[themeName] || 0) + 1;
    }
  });

  res.json({
    learningStreak: user?.learning_streak || 0,
    totalLearningTime: user?.total_learning_time || 0, // in minutes
    totalQuizzes,
    averageScore,
    topicsCompleted: topicsCompleted || 0,
    bookmarksCount: bookmarksCount || 0,
    themeProgress: Object.entries(themeStats).map(([theme, count]) => ({
      theme,
      topicsCompleted: count
    }))
  });
}));

/**
 * POST /api/user/bookmark/:topicId
 * Bookmark a topic
 */
router.post('/bookmark/:topicId', authenticateToken, asyncHandler(async (req, res) => {
  const supabase = requireSupabase();
  const userId = req.user.id;
  const { topicId } = req.params;
  const { notes } = req.body;

  // Check if already bookmarked
  const { data: existing } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', userId)
    .eq('topic_id', topicId)
    .single();

  if (existing) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Topic already bookmarked'
    });
  }

  // Create bookmark
  const { data: bookmark, error } = await supabase
    .from('bookmarks')
    .insert([{
      user_id: userId,
      topic_id: topicId,
      notes: notes || null
    }])
    .select()
    .single();

  if (error) throw error;

  // Increment bookmark count on topic
  await supabase.rpc('increment_bookmark_count', { topic_id_param: topicId });

  res.json({
    message: 'Topic bookmarked successfully',
    bookmark
  });
}));

/**
 * DELETE /api/user/bookmark/:topicId
 * Remove bookmark
 */
router.delete('/bookmark/:topicId', authenticateToken, asyncHandler(async (req, res) => {
  const supabase = requireSupabase();
  const userId = req.user.id;
  const { topicId } = req.params;

  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('user_id', userId)
    .eq('topic_id', topicId);

  if (error) throw error;

  // Decrement bookmark count on topic
  await supabase.rpc('decrement_bookmark_count', { topic_id_param: topicId });

  res.json({
    message: 'Bookmark removed successfully'
  });
}));

/**
 * GET /api/user/bookmarks
 * Get all bookmarked topics
 */
router.get('/bookmarks', authenticateToken, asyncHandler(async (req, res) => {
  const supabase = requireSupabase();
  const userId = req.user.id;
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  const { data: bookmarks, error, count } = await supabase
    .from('bookmarks')
    .select(`
      id,
      notes,
      created_at,
      topics:topic_id (id, title, summary, theme_name, difficulty_level)
    `, { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  res.json({
    bookmarks,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      totalPages: Math.ceil(count / limit)
    }
  });
}));

module.exports = router;
