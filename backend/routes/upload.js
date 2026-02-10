const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const { requireSupabase } = require('../lib/supabase');

// Configure multer for PDF uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});

/**
 * POST /api/upload/pdf
 * Upload a PDF and create a topic
 */
router.post('/pdf', authenticateToken, upload.single('pdf'), async (req, res) => {
    try {
        const supabase = requireSupabase();
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        const { title, theme_id, summary, difficulty_level } = req.body;

        if (!title || !theme_id) {
            return res.status(400).json({ error: 'Title and theme are required' });
        }

        // Get theme name
        const { data: theme } = await supabase
            .from('themes')
            .select('name')
            .eq('id', theme_id)
            .single();

        const pdfUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/uploads/${req.file.filename}`;

        // Create topic
        const { data: topic, error } = await supabase
            .from('topics')
            .insert({
                title,
                theme_id,
                theme_name: theme?.name || 'General',
                summary: summary || '',
                difficulty_level: difficulty_level || 'medium',
                pdf_url: pdfUrl,
                pdf_filename: req.file.originalname,
                is_verified: true,
                uploaded_by: req.user.id
            })
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: 'PDF uploaded successfully',
            topic,
            pdfUrl
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/upload/my-uploads
 * Get user's uploaded PDFs
 */
router.get('/my-uploads', authenticateToken, async (req, res) => {
    try {
        const supabase = requireSupabase();
        const { data: topics, error } = await supabase
            .from('topics')
            .select('*')
            .eq('uploaded_by', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ topics });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
