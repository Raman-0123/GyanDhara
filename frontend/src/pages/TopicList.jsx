import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { BookOpen, Clock, Award, Loader, Search, Filter } from 'lucide-react';

export default function TopicList() {
    const { themeId } = useParams();
    const [topics, setTopics] = useState([]);
    const [topicsWithBooks, setTopicsWithBooks] = useState({}); // Store book counts
    const [theme, setTheme] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [difficulty, setDifficulty] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        loadTheme();
        loadTopics();
    }, [themeId, page, difficulty]);

    const loadTheme = async () => {
        try {
            const response = await api.get('/api/topics/themes');
            const foundTheme = response.data.themes?.find(t => t.id === themeId);
            setTheme(foundTheme);
        } catch (error) {
            console.error(error);
        }
    };

    const loadTopics = async () => {
        setLoading(true);
        try {
            const params = {
                theme: themeId,
                page,
                limit: 12,
                ...(difficulty && { difficulty })
            };
            const response = await api.get('/api/topics', { params });
            const loadedTopics = response.data.topics || [];
            setTopics(loadedTopics);
            setTotalPages(response.data.pagination?.totalPages || 1);

            // Load book counts for each topic
            await loadBookCounts(loadedTopics);
        } catch (error) {
            toast.error('Failed to load topics');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadBookCounts = async (topicsList) => {
        const bookCounts = {};
        try {
            // Load books for each topic in parallel
            const bookPromises = topicsList.map(topic =>
                api.get(`/api/books/topic/${topic.id}`)
                    .then(res => ({ topicId: topic.id, count: res.data.books?.length || 0 }))
                    .catch(() => ({ topicId: topic.id, count: 0 }))
            );
            const results = await Promise.all(bookPromises);
            results.forEach(({ topicId, count }) => {
                bookCounts[topicId] = count;
            });
            setTopicsWithBooks(bookCounts);
        } catch (error) {
            console.error('Error loading book counts:', error);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setLoading(true);
        try {
            const response = await api.get(`/api/topics/search/${searchQuery}`);
            setTopics(response.data.topics || []);
        } catch (error) {
            toast.error('Search failed');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                    <Loader className="w-12 h-12 text-primary-600" />
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 py-12">
            <div className="container mx-auto px-4">
                {/* Theme Header */}
                {theme && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-12"
                    >
                        <div className="text-6xl mb-4">{theme.icon || '📚'}</div>
                        <h1 className="text-5xl font-black mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            {theme.name}
                        </h1>
                        <p className="text-2xl text-gray-600 dark:text-gray-300 hindi-text mb-4">{theme.name_hi}</p>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            {theme.description || `Explore ${theme.topic_count} topics in ${theme.name}`}
                        </p>
                    </motion.div>
                )}

                {/* Search and Filters */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-8 flex flex-col md:flex-row gap-4"
                >
                    <div className="w-full md:flex-1 min-w-0 relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Search topics..."
                            className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-primary-500 transition-all text-lg"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    </div>

                    <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="w-full md:w-auto px-6 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white bg-white cursor-pointer text-lg"
                    >
                        <option value="">All Levels</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSearch}
                        className="w-full md:w-auto bg-gradient-to-r from-primary-600 to-secondary-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                    >
                        Search
                    </motion.button>
                </motion.div>

                {/* Topics Grid */}
                {topics.length === 0 ? (
                    <div className="text-center py-20">
                        <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                        <p className="text-xl text-gray-600 dark:text-gray-400">No topics found</p>
                    </div>
                ) : (
                    <>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {topics.map((topic, index) => (
                                <motion.div
                                    key={topic.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    whileHover={{ y: -8, scale: 1.02 }}
                                >
                                    {/* Link to books list if multiple books, otherwise direct to reader */}
                                    <Link to={topicsWithBooks[topic.id] > 1
                                        ? `/topics/${topic.id}/books`
                                        : `/topics/${topic.id}`}>
                                        <div className="card cursor-pointer h-full flex flex-col dark:bg-gray-800 dark:border dark:border-gray-700">
                                            <h3 className="text-2xl font-bold mb-3 text-gray-800 dark:text-white line-clamp-2">
                                                {topic.title}
                                            </h3>

                                            <p className="text-gray-600 dark:text-gray-400 mb-4 flex-1 line-clamp-3">
                                                {topic.summary || 'No summary available'}
                                            </p>

                                            <div className="flex flex-wrap gap-2 mb-4">
                                                <span className={`badge ${topic.difficulty_level === 'easy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                    topic.difficulty_level === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                    }`}>
                                                    {topic.difficulty_level || 'medium'}
                                                </span>

                                                {topic.language && (
                                                    <span className="badge bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                        {topic.language}
                                                    </span>
                                                )}

                                                {/* Show book count badge if multiple books */}
                                                {topicsWithBooks[topic.id] > 1 && (
                                                    <span className="badge bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                                        📚 {topicsWithBooks[topic.id]} Books
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-4 border-t dark:border-gray-700">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    <span>{topicsWithBooks[topic.id] || 0} Books</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Award className="w-4 h-4" />
                                                    <span>Randhawa Singh</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="flex justify-center gap-2 mt-12"
                            >
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-6 py-3 rounded-lg bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary-500 transition-all font-semibold"
                                >
                                    Previous
                                </button>

                                <div className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold">
                                    Page {page} of {totalPages}
                                </div>

                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-6 py-3 rounded-lg bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary-500 transition-all font-semibold"
                                >
                                    Next
                                </button>
                            </motion.div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
