/**
 * GitHub Data Fetching Routes
 * Fetch processed JSON files from GitHub repository
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

// GitHub configuration from environment or defaults
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'your-username';
const GITHUB_REPO = process.env.GITHUB_REPO || 'gyandhara-data';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const GITHUB_DATA_PATH = 'books';

// Base URL for raw GitHub content
const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${GITHUB_DATA_PATH}`;

// In-memory cache (optional, can be replaced with Redis)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get data from cache or fetch from GitHub
 */
async function getCachedOrFetch(url, cacheKey) {
    // Check cache
    if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            console.log(`Cache hit: ${cacheKey}`);
            return cached.data;
        }
        // Cache expired
        cache.delete(cacheKey);
    }

    // Fetch from GitHub
    console.log(`Fetching from GitHub: ${url}`);
    try {
        const response = await axios.get(url, {
            timeout: 30000,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'GyanDhara-App/1.0'
            }
        });

        // Store in cache
        cache.set(cacheKey, {
            data: response.data,
            timestamp: Date.now()
        });

        return response.data;
    } catch (error) {
        if (error.response?.status === 404) {
            throw new Error('Resource not found on GitHub');
        }
        throw new Error(`Failed to fetch from GitHub: ${error.message}`);
    }
}

/**
 * GET /api/github/books
 * Get list of all books (index)
 */
router.get('/books', async (req, res) => {
    try {
        const indexUrl = `${GITHUB_RAW_BASE}/index.json`;
        const data = await getCachedOrFetch(indexUrl, 'books-index');

        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('Error fetching books index:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/github/books/:bookId
 * Get book metadata
 */
router.get('/books/:bookId', async (req, res) => {
    try {
        const { bookId } = req.params;
        const metadataUrl = `${GITHUB_RAW_BASE}/${bookId}/metadata.json`;

        const data = await getCachedOrFetch(metadataUrl, `book-${bookId}-metadata`);

        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error(`Error fetching book ${req.params.bookId}:`, error.message);
        res.status(404).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/github/books/:bookId/topics
 * Get all topics for a book
 */
router.get('/books/:bookId/topics', async (req, res) => {
    try {
        const { bookId } = req.params;
        const { language } = req.query; // Optional: filter by language

        const topicsUrl = `${GITHUB_RAW_BASE}/${bookId}/topics.json`;
        const data = await getCachedOrFetch(topicsUrl, `book-${bookId}-topics`);

        // If language filter is provided, add translations to response
        let topics = data.topics || [];

        if (language && language !== 'all') {
            topics = topics.map(topic => ({
                ...topic,
                // Replace title, summary, content with translated versions if available
                title: topic.translations?.[language]?.title || topic.title,
                summary: topic.translations?.[language]?.summary || topic.summary,
                content: topic.translations?.[language]?.content || topic.content,
                displayLanguage: language
            }));
        }

        res.json({
            success: true,
            data: {
                bookId: data.bookId,
                totalTopics: topics.length,
                topics: topics
            }
        });
    } catch (error) {
        console.error(`Error fetching topics for ${req.params.bookId}:`, error.message);
        res.status(404).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/github/books/:bookId/topics/:topicId
 * Get a specific topic
 */
router.get('/books/:bookId/topics/:topicId', async (req, res) => {
    try {
        const { bookId, topicId } = req.params;
        const { language } = req.query;

        const topicsUrl = `${GITHUB_RAW_BASE}/${bookId}/topics.json`;
        const data = await getCachedOrFetch(topicsUrl, `book-${bookId}-topics`);

        const topic = (data.topics || []).find(t => t.id === topicId);

        if (!topic) {
            return res.status(404).json({
                success: false,
                error: 'Topic not found'
            });
        }

        // Apply language translation if requested
        let resultTopic = { ...topic };
        if (language && language !== 'all' && topic.translations?.[language]) {
            resultTopic.title = topic.translations[language].title || topic.title;
            resultTopic.summary = topic.translations[language].summary || topic.summary;
            resultTopic.content = topic.translations[language].content || topic.content;
            resultTopic.displayLanguage = language;
        }

        res.json({
            success: true,
            data: resultTopic
        });
    } catch (error) {
        console.error(`Error fetching topic ${req.params.topicId}:`, error.message);
        res.status(404).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/github/books/:bookId/quizzes
 * Get all quizzes for a book
 */
router.get('/books/:bookId/quizzes', async (req, res) => {
    try {
        const { bookId } = req.params;

        const quizzesUrl = `${GITHUB_RAW_BASE}/${bookId}/quizzes.json`;
        const data = await getCachedOrFetch(quizzesUrl, `book-${bookId}-quizzes`);

        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error(`Error fetching quizzes for ${req.params.bookId}:`, error.message);
        res.status(404).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/github/books/:bookId/quizzes/:topicId
 * Get quiz for a specific topic
 */
router.get('/books/:bookId/quizzes/:topicId', async (req, res) => {
    try {
        const { bookId, topicId } = req.params;

        const quizzesUrl = `${GITHUB_RAW_BASE}/${bookId}/quizzes.json`;
        const data = await getCachedOrFetch(quizzesUrl, `book-${bookId}-quizzes`);

        const quiz = (data.quizzes || []).find(q => q.topicId === topicId);

        if (!quiz) {
            return res.status(404).json({
                success: false,
                error: 'Quiz not found for this topic'
            });
        }

        res.json({
            success: true,
            data: quiz
        });
    } catch (error) {
        console.error(`Error fetching quiz for topic ${req.params.topicId}:`, error.message);
        res.status(404).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/github/books/:bookId/pages
 * Get all page files for a book
 */
router.get('/books/:bookId/pages', async (req, res) => {
    try {
        const { bookId } = req.params;

        // Fetch metadata to know how many pages
        const metadataUrl = `${GITHUB_RAW_BASE}/${bookId}/metadata.json`;
        const metadata = await getCachedOrFetch(metadataUrl, `book-${bookId}-metadata`);

        const totalPages = metadata.totalPages || 0;
        const pages = [];

        // Fetch each page (limit to reasonable amount)
        const maxPages = Math.min(totalPages, 100);
        for (let i = 1; i <= maxPages; i++) {
            try {
                const pageUrl = `${GITHUB_RAW_BASE}/${bookId}/pages/page_${i}.json`;
                const pageData = await getCachedOrFetch(pageUrl, `book-${bookId}-page-${i}`);
                pages.push(pageData);
            } catch (error) {
                console.warn(`Page ${i} not found`);
            }
        }

        res.json({
            success: true,
            data: {
                bookId,
                totalPages: pages.length,
                pages
            }
        });
    } catch (error) {
        console.error(`Error fetching pages for ${req.params.bookId}:`, error.message);
        res.status(404).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/github/books/:bookId/pages/:pageNumber
 * Get a specific page
 */
router.get('/books/:bookId/pages/:pageNumber', async (req, res) => {
    try {
        const { bookId, pageNumber } = req.params;

        const pageUrl = `${GITHUB_RAW_BASE}/${bookId}/pages/page_${pageNumber}.json`;
        const data = await getCachedOrFetch(pageUrl, `book-${bookId}-page-${pageNumber}`);

        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error(`Error fetching page ${req.params.pageNumber}:`, error.message);
        res.status(404).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/github/cache
 * Clear cache (admin endpoint, add authentication in production)
 */
router.delete('/cache', (req, res) => {
    cache.clear();
    res.json({
        success: true,
        message: 'Cache cleared'
    });
});

/**
 * GET /api/github/config
 * Get GitHub configuration (for debugging)
 */
router.get('/config', (req, res) => {
    res.json({
        success: true,
        config: {
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            branch: GITHUB_BRANCH,
            dataPath: GITHUB_DATA_PATH,
            baseUrl: GITHUB_RAW_BASE
        }
    });
});

module.exports = router;
