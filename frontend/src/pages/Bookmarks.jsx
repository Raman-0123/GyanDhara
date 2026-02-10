import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Bookmarks = () => {
    const { user, removeBookmark } = useAuth();
    const navigate = useNavigate();
    const [bookmarks, setBookmarks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && user.bookmarks?.length > 0) {
            fetchBookmarks();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchBookmarks = async () => {
        try {
            setLoading(true);
            // Fetch topic details for each bookmarked ID
            const bookmarkPromises = user.bookmarks.map(topicId =>
                api.get(`/api/topics/${topicId}`).catch(err => {
                    console.error(`Error fetching topic ${topicId}:`, err);
                    return null;
                })
            );
            const results = await Promise.all(bookmarkPromises);
            const validBookmarks = results.filter(r => r !== null).map(r => r.data);
            setBookmarks(validBookmarks);
        } catch (error) {
            console.error('Error fetching bookmarks:', error);
            toast.error('Failed to load bookmarks');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveBookmark = (topicId) => {
        removeBookmark(topicId);
        setBookmarks(bookmarks.filter(b => b.id !== topicId));
        toast.success('Bookmark removed');
    };

    const getDifficultyColor = (level) => {
        switch (level) {
            case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center max-w-md mx-4"
                >
                    <div className="text-6xl mb-4">🔖</div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        Create Profile to Save Bookmarks
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Save your favorite topics and access them anytime with a free profile
                    </p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                        Create Profile
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
            <div className="max-w-6xl mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        My Bookmarks
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        {bookmarks.length} saved topics
                    </p>
                </motion.div>

                {bookmarks.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center"
                    >
                        <svg
                            className="w-24 h-24 mx-auto text-gray-400 mb-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                            />
                        </svg>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            No bookmarks yet
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Start exploring topics and bookmark your favorites!
                        </p>
                        <button
                            onClick={() => navigate('/themes')}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                        >
                            Browse Topics
                        </button>
                    </motion.div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {bookmarks.map((bookmark, index) => (
                            <motion.div
                                key={bookmark.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(bookmark.difficulty_level)}`}>
                                            {bookmark.difficulty_level || 'medium'}
                                        </span>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => handleRemoveBookmark(bookmark.id)}
                                        className="text-red-500 hover:text-red-700 transition-colors"
                                        title="Remove bookmark"
                                    >
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                            <path
                                                fillRule="evenodd"
                                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </motion.button>
                                </div>

                                <h3
                                    className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 cursor-pointer hover:text-blue-600"
                                    onClick={() => navigate(`/topics/${bookmark.id}`)}
                                >
                                    {bookmark.title}
                                </h3>

                                {bookmark.summary && (
                                    <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3 text-sm">
                                        {bookmark.summary}
                                    </p>
                                )}

                                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                            />
                                        </svg>
                                        {bookmark.theme_name}
                                    </span>
                                </div>

                                <button
                                    onClick={() => navigate(`/topics/${bookmark.id}`)}
                                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors"
                                >
                                    Read Topic
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Bookmarks;
