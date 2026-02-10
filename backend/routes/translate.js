const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');
const translate = require('@iamtraction/google-translate');
const { optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Supabase client imported from shared lib (uses service role if provided)

/**
 * POST /api/translate/lesson
 * Translate lesson content to target language
 */
router.post('/lesson', asyncHandler(async (req, res) => {
    const { lessonId, targetLang } = req.body;

    if (!lessonId || !targetLang) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'lessonId and targetLang are required'
        });
    }

    // Get lesson from database
    const { data: lesson, error: lessonError } = await supabase
        .from('topic_lessons')
        .select('*')
        .eq('id', lessonId)
        .single();

    if (lessonError || !lesson) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Lesson not found'
        });
    }

    // Check if translation already cached
    const cachedTranslations = lesson.translations || {};
    if (cachedTranslations[targetLang]) {
        return res.json({
            success: true,
            cached: true,
            translation: cachedTranslations[targetLang]
        });
    }

    try {
        // Translate title and content_text (which is pure plain text, no HTML)
        const textToTranslate = lesson.content_text || stripHtml(lesson.content_html || '');

        const [titleTranslation, contentTranslation] = await Promise.all([
            translate(lesson.title, { to: targetLang }),
            translate(textToTranslate, { to: targetLang })
        ]);

        const translatedData = {
            title: titleTranslation.text,
            content: contentTranslation.text
        };

        // Cache the translation in database
        cachedTranslations[targetLang] = translatedData;

        await supabase
            .from('topic_lessons')
            .update({ translations: cachedTranslations })
            .eq('id', lessonId);

        res.json({
            success: true,
            cached: false,
            translation: translatedData
        });

    } catch (translateError) {
        console.error('Translation error:', translateError);
        res.status(500).json({
            error: 'Translation Failed',
            message: 'Could not translate content. Please try again.',
            details: translateError.message
        });
    }
}));

/**
 * POST /api/translate/topic
 * Translate entire topic (all lessons)
 */
router.post('/topic', asyncHandler(async (req, res) => {
    const { topicId, targetLang } = req.body;

    if (!topicId || !targetLang) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'topicId and targetLang are required'
        });
    }

    // Get all lessons for this topic
    const { data: lessons, error } = await supabase
        .from('topic_lessons')
        .select('*')
        .eq('topic_id', topicId)
        .order('position');

    if (error) throw error;

    const translations = [];

    for (const lesson of lessons) {
        const cachedTranslations = lesson.translations || {};

        if (cachedTranslations[targetLang]) {
            translations.push({
                lessonId: lesson.id,
                position: lesson.position,
                cached: true,
                translation: cachedTranslations[targetLang]
            });
        } else {
            try {
                const [titleTranslation, contentTranslation] = await Promise.all([
                    translate(lesson.title, { to: targetLang }),
                    translate(lesson.content_text || stripHtml(lesson.content_html), { to: targetLang })
                ]);

                const translatedData = {
                    title: titleTranslation.text,
                    content: contentTranslation.text
                };

                cachedTranslations[targetLang] = translatedData;

                await supabase
                    .from('topic_lessons')
                    .update({ translations: cachedTranslations })
                    .eq('id', lesson.id);

                translations.push({
                    lessonId: lesson.id,
                    position: lesson.position,
                    cached: false,
                    translation: translatedData
                });

                // Add delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (translateError) {
                console.error(`Translation error for lesson ${lesson.id}:`, translateError);
                translations.push({
                    lessonId: lesson.id,
                    position: lesson.position,
                    error: translateError.message
                });
            }
        }
    }

    res.json({
        success: true,
        targetLang,
        translations
    });
}));

/**
 * GET /api/translate/languages
 * Get supported languages
 */
router.get('/languages', (req, res) => {
    res.json({
        languages: [
            { code: 'en', name: 'English' },
            { code: 'hi', name: 'Hindi (हिंदी)' },
            { code: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)' },
            { code: 'bn', name: 'Bengali (বাংলা)' },
            { code: 'te', name: 'Telugu (తెలుగు)' },
            { code: 'mr', name: 'Marathi (मराठी)' },
            { code: 'ta', name: 'Tamil (தமிழ்)' },
            { code: 'ur', name: 'Urdu (اردو)' },
            { code: 'gu', name: 'Gujarati (ગુજરાતી)' },
            { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
            { code: 'ml', name: 'Malayalam (മലയാളം)' },
            { code: 'or', name: 'Odia (ଓଡ଼ିଆ)' },
            { code: 'es', name: 'Spanish (Español)' },
            { code: 'fr', name: 'French (Français)' },
            { code: 'de', name: 'German (Deutsch)' },
            { code: 'zh-CN', name: 'Chinese Simplified (简体中文)' },
            { code: 'ja', name: 'Japanese (日本語)' },
            { code: 'ko', name: 'Korean (한국어)' },
            { code: 'ar', name: 'Arabic (العربية)' },
            { code: 'ru', name: 'Russian (Русский)' }
        ]
    });
});

// Helper function to strip HTML tags
function stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

module.exports = router;
