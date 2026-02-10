import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { BookOpen, Loader } from 'lucide-react';

export default function ThemeGallery() {
    const [themes, setThemes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadThemes();
    }, []);

    const loadThemes = async () => {
        try {
            const response = await api.get('/api/topics/themes');
            setThemes(response.data.themes || []);
        } catch (error) {
            toast.error('Failed to load themes');
            console.error(error);
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
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 py-6">
            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <motion.h1
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        className="text-6xl font-black mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"
                    >
                        Explore Knowledge Themes
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-2xl text-gray-600 dark:text-gray-300 font-medium"
                    >
                        Choose from 18 diverse themes covering 160,000+ topics
                    </motion.p>
                </motion.div>

                {themes.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-20"
                    >
                        <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                        <p className="text-xl text-gray-600 dark:text-gray-400">No themes available yet</p>
                        <p className="text-gray-500 dark:text-gray-500 mt-2">Check back soon!</p>
                    </motion.div>
                ) : (
                    <div className="grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                        {themes.map((theme, index) => (
                            <motion.div
                                key={theme.id}
                                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
                                whileHover={{ y: -10, scale: 1.05, rotateZ: 2 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Link to={`/themes/${theme.id}`}>
                                    <div className="group relative card text-center cursor-pointer hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-white via-blue-50 to-purple-50 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 border-2 border-transparent hover:border-blue-300 dark:hover:border-blue-500 overflow-hidden">
                                        {/* Animated gradient overlay */}
                                        <motion.div
                                            className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-purple-400/10 to-pink-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                            animate={{
                                                backgroundPosition: ['0% 0%', '100% 100%'],
                                            }}
                                            transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
                                        />

                                        <motion.div
                                            className="text-6xl mb-4 relative z-10"
                                            whileHover={{ scale: 1.2, rotate: 10 }}
                                            transition={{ type: "spring", stiffness: 300 }}
                                        >
                                            {theme.icon || '📚'}
                                        </motion.div>

                                        <h3 className="text-lg font-bold mb-2 text-gray-800 dark:text-white relative z-10">
                                            {theme.name}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 hindi-text relative z-10">{theme.name_hi}</p>
                                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 relative z-10">
                                            <motion.span
                                                className="text-primary-600 dark:text-primary-400 font-semibold text-lg inline-block"
                                                whileHover={{ scale: 1.2 }}
                                            >
                                                {theme.topic_count || 0}
                                            </motion.span>
                                            <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">topics</span>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
