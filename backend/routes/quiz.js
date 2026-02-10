const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('../middleware/auth');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

/**
 * POST /api/quiz/submit
 * Submit quiz answers and get score
 */
router.post('/submit', authenticateToken, async (req, res) => {
    try {
        const { topicId, quizId, answers } = req.body;

        if (!topicId || !quizId || !answers) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get quiz
        const { data: quiz, error: quizError } = await supabase
            .from('quizzes')
            .select('*')
            .eq('id', quizId)
            .single();

        if (quizError || !quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        // Calculate score
        let correctAnswers = 0;
        const totalQuestions = quiz.questions.length;

        quiz.questions.forEach((question, index) => {
            if (answers[index] === question.correctAnswer) {
                correctAnswers++;
            }
        });

        const score = Math.round((correctAnswers / totalQuestions) * 100);

        // Save quiz attempt
        const { error: attemptError } = await supabase
            .from('quiz_attempts')
            .insert({
                user_id: req.user.id,
                quiz_id: quizId,
                topic_id: topicId,
                score,
                answers,
                completed_at: new Date().toISOString()
            });

        if (attemptError) console.error('Error saving attempt:', attemptError);

        // Update user stats
        await supabase.rpc('increment_user_quiz_count', { user_id: req.user.id });

        res.json({
            success: true,
            score,
            correctAnswers,
            totalQuestions,
            feedback: score >= 80 ? 'Excellent!' : score >= 60 ? 'Good job!' : 'Keep practicing!'
        });

    } catch (error) {
        console.error('Quiz submit error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/quiz/history
 * Get user's quiz history
 */
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const { data: attempts, error } = await supabase
            .from('quiz_attempts')
            .select(`
                *,
                topics (title, theme_name)
            `)
            .eq('user_id', req.user.id)
            .order('completed_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        res.json({ attempts });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
