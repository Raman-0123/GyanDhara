import axios from 'axios';

// In production (Vercel), use relative paths. In development, use localhost
const API_URL = import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? '' : 'http://localhost:3000');

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000,
});

// Request interceptor - add auth token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        console.log('🔐 [API] Request to:', config.method?.toUpperCase(), config.url);
        if (token) {
            console.log('🔑 [API] Token attached:', token.substring(0, 20) + '...');
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            console.log('⚠️ [API] No token found in localStorage');
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            const currentPath = window.location.pathname;

            // Only redirect to login if not already on login/signup pages
            if (currentPath !== '/login' && currentPath !== '/signup') {
                console.error('Authentication failed, redirecting to login');
                localStorage.removeItem('token');
                localStorage.removeItem('user');

                // Small delay to prevent race conditions
                setTimeout(() => {
                    window.location.href = '/login';
                }, 100);
            }
        }
        return Promise.reject(error);
    }
);

// =============================================================================
// GITHUB-BACKED DATA API
// Fetch processed JSON files from GitHub repository
// =============================================================================

/**
 * GitHub Data Service
 * Fetch books, topics, quizzes from GitHub JSON files
 */
export const githubAPI = {
    /**
     * Get list of all books
     */
    getBooks: async () => {
        const response = await api.get('/api/github/books');
        return response.data;
    },

    /**
     * Get book metadata
     */
    getBook: async (bookId) => {
        const response = await api.get(`/api/github/books/${bookId}`);
        return response.data;
    },

    /**
     * Get all topics for a book
     * @param {string} bookId - Book identifier
     * @param {string} language - Optional language filter (en, hi, pa, etc.)
     */
    getTopics: async (bookId, language = null) => {
        const params = language ? { language } : {};
        const response = await api.get(`/api/github/books/${bookId}/topics`, { params });
        return response.data;
    },

    /**
     * Get a specific topic
     * @param {string} bookId - Book identifier
     * @param {string} topicId - Topic identifier
     * @param {string} language - Optional language filter
     */
    getTopic: async (bookId, topicId, language = null) => {
        const params = language ? { language } : {};
        const response = await api.get(`/api/github/books/${bookId}/topics/${topicId}`, { params });
        return response.data;
    },

    /**
     * Get all quizzes for a book
     */
    getQuizzes: async (bookId) => {
        const response = await api.get(`/api/github/books/${bookId}/quizzes`);
        return response.data;
    },

    /**
     * Get quiz for a specific topic
     */
    getQuiz: async (bookId, topicId) => {
        const response = await api.get(`/api/github/books/${bookId}/quizzes/${topicId}`);
        return response.data;
    },

    /**
     * Get all pages for a book
     */
    getPages: async (bookId) => {
        const response = await api.get(`/api/github/books/${bookId}/pages`);
        return response.data;
    },

    /**
     * Get a specific page
     */
    getPage: async (bookId, pageNumber) => {
        const response = await api.get(`/api/github/books/${bookId}/pages/${pageNumber}`);
        return response.data;
    },

    /**
     * Clear cache (admin)
     */
    clearCache: async () => {
        const response = await api.delete('/api/github/cache');
        return response.data;
    },

    /**
     * Get GitHub configuration
     */
    getConfig: async () => {
        const response = await api.get('/api/github/config');
        return response.data;
    }
};

export default api;
