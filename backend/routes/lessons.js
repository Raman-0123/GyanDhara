const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Supabase client imported from shared lib (uses service role if provided)

// Configure multer for file uploads (images and audio)
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/lessons');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (err) {
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|mp3|wav|ogg|m4a/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images (JPEG, PNG, GIF, WebP) and audio files (MP3, WAV, OGG, M4A) are allowed'));
    }
});

/**
 * GET /api/lessons/topic/:topicId
 * Get all lessons for a topic
 */
router.get('/topic/:topicId', asyncHandler(async (req, res) => {
    const { topicId } = req.params;

    const { data: lessons, error } = await supabase
        .from('topic_lessons')
        .select('*')
        .eq('topic_id', topicId)
        .eq('is_active', true)
        .order('position');

    if (error) throw error;

    res.json({
        success: true,
        lessons,
        count: lessons.length
    });
}));

/**
 * GET /api/lessons/:id
 * Get single lesson by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { data: lesson, error } = await supabase
        .from('topic_lessons')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !lesson) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Lesson not found'
        });
    }

    res.json({
        success: true,
        lesson
    });
}));

/**
 * POST /api/lessons
 * Create a new lesson
 */
router.post('/', upload.fields([
    { name: 'images', maxCount: 2000 },
    { name: 'audio', maxCount: 1 }
]), asyncHandler(async (req, res) => {
    const { topic_id, position, title, content_html, content_text, author_name } = req.body;

    // Basic validation for UUID and required fields
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pos = parseInt(position, 10);

    if (!topic_id || !uuidRegex.test(topic_id)) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid or missing topic_id. Please provide a valid UUID from the topics table.'
        });
    }

    if (!pos || pos < 1) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid lesson position. Position must be a positive integer starting at 1.'
        });
    }

    if (!topic_id || !position || !title || (!content_html && !content_text)) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'topic_id, position, title, and either content_html or content_text are required'
        });
    }

    // Handle uploaded images
    const images = [];
    if (req.files && req.files.images) {
        for (const file of req.files.images) {
            images.push({
                url: `/uploads/lessons/${file.filename}`,
                filename: file.originalname,
                caption: ''
            });
        }
    }

    // Handle uploaded audio
    let audioUrl = null;
    let audioFilename = null;
    if (req.files && req.files.audio && req.files.audio[0]) {
        const audioFile = req.files.audio[0];
        audioUrl = `/uploads/lessons/${audioFile.filename}`;
        audioFilename = audioFile.originalname;
    }

    // Store PURE plain text (no HTML) in content_text
    // Build simple HTML for display from plain text
    const safeAuthor = (author_name || '').trim();
    let plainText = content_text ? content_text.trim() : '';
    let finalHtml = content_html;

    // If user provides content_text, use it as-is (plain text only)
    // Build HTML from plain text for display with proper spacing
    // Note: Title is displayed separately by frontend, so don't include it in HTML
    if (plainText && !finalHtml) {
        const paragraphs = plainText
            .split(/\n+/)
            .filter(Boolean)
            .map(p => `<p style="margin-bottom: 2rem; line-height: 1.8; font-size: 1.125rem; text-align: justify;">${escapeHtml(p)}</p>`)
            .join('\n');

        finalHtml = `<article style="max-width: 100%;">
${safeAuthor ? `<p class="author" style="font-size: 0.95rem; color: #6b7280; font-style: italic; margin-bottom: 2rem;">By ${escapeHtml(safeAuthor)}</p>` : ''}
<div style="margin-top: ${safeAuthor ? '0' : '1.5rem'};">
${paragraphs}
</div>
</article>`;
    } else if (finalHtml) {
        // If HTML provided, extract plain text from it
        plainText = stripHtml(finalHtml);
    }

    const { data: lesson, error } = await supabase
        .from('topic_lessons')
        .insert({
            topic_id,
            position: pos,
            title,
            content_html: finalHtml,
            content_text: plainText,  // PURE plain text, no HTML tags
            audio_url: audioUrl,
            audio_filename: audioFilename,
            images: images.length > 0 ? images : null,
            translations: {}
        })
        .select()
        .single();

    if (error) throw error;

    res.status(201).json({
        success: true,
        message: 'Lesson created successfully',
        lesson
    });
}));

/**
 * PUT /api/lessons/:id
 * Update a lesson
 */
router.put('/:id', upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'audio', maxCount: 1 }
]), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { position, title, content_html, content_text, existing_images } = req.body;

    // Get existing lesson
    const { data: existingLesson, error: fetchError } = await supabase
        .from('topic_lessons')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError || !existingLesson) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Lesson not found'
        });
    }

    const updateData = {};

    if (position) updateData.position = parseInt(position);
    if (title) updateData.title = title;

    // Handle content updates - prefer plain text
    if (content_text || content_html) {
        if (content_text) {
            // Plain text provided - store as-is and build HTML
            const plainText = content_text.trim();
            const paragraphs = plainText.split(/\n+/).filter(Boolean).map(p => `<p>${escapeHtml(p)}</p>`).join('\n');
            updateData.content_text = plainText;
            updateData.content_html = `<article>\n${paragraphs}\n</article>`;
        } else if (content_html) {
            // HTML provided - extract plain text
            updateData.content_html = content_html;
            updateData.content_text = stripHtml(content_html);
        }
        // Clear translations when content changes
        updateData.translations = {};
    }

    // Handle images
    let images = [];
    try {
        images = existing_images ? JSON.parse(existing_images) : [];
    } catch (e) {
        images = existingLesson.images || [];
    }

    if (req.files && req.files.images) {
        for (const file of req.files.images) {
            images.push({
                url: `/uploads/lessons/${file.filename}`,
                filename: file.originalname,
                caption: ''
            });
        }
    }
    if (images.length > 0) updateData.images = images;

    // Handle audio
    if (req.files && req.files.audio && req.files.audio[0]) {
        const audioFile = req.files.audio[0];
        updateData.audio_url = `/uploads/lessons/${audioFile.filename}`;
        updateData.audio_filename = audioFile.originalname;
    }

    const { data: lesson, error } = await supabase
        .from('topic_lessons')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;

    res.json({
        success: true,
        message: 'Lesson updated successfully',
        lesson
    });
}));

/**
 * DELETE /api/lessons/:id
 * Delete a lesson
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
        .from('topic_lessons')
        .delete()
        .eq('id', id);

    if (error) throw error;

    res.json({
        success: true,
        message: 'Lesson deleted successfully'
    });
}));

/**
 * POST /api/lessons/reorder
 * Reorder lessons
 */
router.post('/reorder', asyncHandler(async (req, res) => {
    const { lessonIds } = req.body; // Array of lesson IDs in new order

    if (!Array.isArray(lessonIds)) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'lessonIds must be an array'
        });
    }

    // Update positions
    for (let i = 0; i < lessonIds.length; i++) {
        await supabase
            .from('topic_lessons')
            .update({ position: i + 1 })
            .eq('id', lessonIds[i]);
    }

    res.json({
        success: true,
        message: 'Lessons reordered successfully'
    });
}));

// Helper function to strip HTML tags
function stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

module.exports = router;
