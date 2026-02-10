import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, BookOpen, Clock, TrendingUp } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import StreakCalendar from '../components/StreakCalendar';

export default function Dashboard() {
    const { user, loading: authLoading, createProfile } = useAuth();
    const [progress, setProgress] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCreateProfile, setShowCreateProfile] = useState(false);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                setShowCreateProfile(true);
            }
            setLoading(false);
        }
    }, [user, authLoading]);

    const handleCreateProfile = (e) => {
        e.preventDefault();
        if (!username.trim()) {
            toast.error('Please enter a username');
            return;
        }
        createProfile(username.trim(), email.trim() || null);
        setShowCreateProfile(false);
        toast.success(`Welcome, ${username}! 🎉`);
    };

    if (loading || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 transition-colors duration-500">
            {/* Create Profile Modal */}
            <AnimatePresence>
                {showCreateProfile && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
                        onClick={() => setShowCreateProfile(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-center mb-6">
                                <div className="text-6xl mb-4">🎓</div>
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                    Welcome to GyanDhara!
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Create your learning profile to track progress and build streaks
                                </p>
                            </div>

                            <form onSubmit={handleCreateProfile} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Username *
                                    </label>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 outline-none transition-all"
                                        placeholder="Enter your username"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Email (Optional)
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 outline-none transition-all"
                                        placeholder="your@email.com"
                                    />
                                </div>

                                <div className="pt-4">
                                    <motion.button
                                        type="submit"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 rounded-lg transition-all shadow-lg"
                                    >
                                        Create Profile & Start Learning
                                    </motion.button>
                                </div>
                            </form>

                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
                                Your progress is saved locally in your browser
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-5xl font-black mb-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Welcome back, {user?.username || 'Learner'}! 👋
                            </h1>
                            <p className="text-gray-600 dark:text-gray-300 text-lg">Track your learning progress</p>
                        </div>
                        {user && user.streak?.current > 0 && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-lg"
                            >
                                <span className="text-3xl">🔥</span>
                                <span className="text-3xl font-black text-white">{user.streak.current}</span>
                                <span className="text-white font-semibold">Day Streak!</span>
                            </motion.div>
                        )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <motion.div
                            className="card dark:bg-gray-800 dark:border-gray-700 border-2 border-transparent hover:border-blue-400 dark:hover:border-blue-500"
                            whileHover={{ y: -5, scale: 1.02 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Topics Completed</p>
                                    <p className="text-4xl font-black text-primary-600 dark:text-blue-400 mt-1">
                                        {user?.stats?.topicsCompleted || 0}
                                    </p>
                                </div>
                                <motion.div whileHover={{ rotate: 10, scale: 1.1 }}>
                                    <BookOpen className="w-12 h-12 text-primary-300 dark:text-blue-600" />
                                </motion.div>
                            </div>
                        </motion.div>

                        <motion.div
                            className="card dark:bg-gray-800 dark:border-gray-700 border-2 border-transparent hover:border-purple-400 dark:hover:border-purple-500"
                            whileHover={{ y: -5, scale: 1.02 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Quizzes Taken</p>
                                    <p className="text-4xl font-black text-secondary-600 dark:text-purple-400 mt-1">
                                        {user?.stats?.quizzesTaken || 0}
                                    </p>
                                </div>
                                <motion.div whileHover={{ rotate: -10, scale: 1.1 }}>
                                    <Award className="w-12 h-12 text-secondary-300 dark:text-purple-600" />
                                </motion.div>
                            </div>
                        </motion.div>

                        <motion.div
                            className="card dark:bg-gray-800 dark:border-gray-700 border-2 border-transparent hover:border-pink-400 dark:hover:border-pink-500"
                            whileHover={{ y: -5, scale: 1.02 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Avg Score</p>
                                    <p className="text-4xl font-black text-accent-600 dark:text-pink-400 mt-1">
                                        {user?.stats?.quizzesTaken > 0
                                            ? Math.round((user.stats.totalScore / user.stats.quizzesTaken))
                                            : 0}%
                                    </p>
                                </div>
                                <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }}>
                                    <TrendingUp className="w-12 h-12 text-accent-300 dark:text-pink-600" />
                                </motion.div>
                            </div>
                        </motion.div>

                        <motion.div
                            className="card dark:bg-gray-800 dark:border-gray-700 border-2 border-transparent hover:border-green-400 dark:hover:border-green-500"
                            whileHover={{ y: -5, scale: 1.02 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Current Streak</p>
                                    <p className="text-4xl font-black text-primary-600 dark:text-green-400 mt-1">
                                        {user?.streak?.current || 0} 🔥
                                    </p>
                                </div>
                                <motion.div whileHover={{ y: -3, scale: 1.1 }}>
                                    <Clock className="w-12 h-12 text-primary-300 dark:text-green-600" />
                                </motion.div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Streak Calendar */}
                    {user && (
                        <div className="mb-8">
                            <StreakCalendar streak={user.streak} />
                        </div>
                    )}

                    {/* Recent Activity */}
                    <motion.div
                        className="card dark:bg-gray-800 dark:border-gray-700"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Recent Activity</h2>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="text-sm text-primary-600 dark:text-blue-400 font-semibold hover:underline"
                            >
                                View All →
                            </motion.button>
                        </div>

                        <div className="space-y-4">
                            <motion.div
                                className="flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                                whileHover={{ scale: 1.01, x: 5 }}
                            >
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-2xl mr-4">
                                    📚
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-800 dark:text-white">Ready to start learning?</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Explore 18 themes and 160K+ topics</p>
                                </div>
                                <motion.div
                                    className="text-gray-400"
                                    animate={{ x: [0, 5, 0] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                >
                                    →
                                </motion.div>
                            </motion.div>

                            <motion.div
                                className="flex items-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-700"
                                whileHover={{ scale: 1.01, x: 5 }}
                            >
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-2xl mr-4">
                                    🎯
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-800 dark:text-white">Set your learning goals</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Complete daily quizzes and build streaks</p>
                                </div>
                            </motion.div>

                            <motion.div
                                className="flex items-center p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-700"
                                whileHover={{ scale: 1.01, x: 5 }}
                            >
                                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-2xl mr-4">
                                    ⚡
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-800 dark:text-white">Track your progress</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Watch your stats grow as you learn</p>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* Quick Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="grid md:grid-cols-2 gap-6 mt-8"
                    >
                        <Link to="/themes">
                            <motion.div
                                className="card dark:bg-gradient-to-br dark:from-blue-900 dark:to-purple-900 bg-gradient-to-br from-blue-500 to-purple-600 text-white cursor-pointer overflow-hidden relative"
                                whileHover={{ scale: 1.02, y: -5 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-12 -mb-12" />
                                <div className="relative z-10">
                                    <div className="text-5xl mb-4">🎨</div>
                                    <h3 className="text-2xl font-bold mb-2">Explore Themes</h3>
                                    <p className="text-blue-100">Browse 18 diverse learning categories</p>
                                </div>
                            </motion.div>
                        </Link>

                        <motion.div
                            className="card dark:bg-gradient-to-br dark:from-pink-900 dark:to-orange-900 bg-gradient-to-br from-pink-500 to-orange-600 text-white cursor-pointer overflow-hidden relative"
                            whileHover={{ scale: 1.02, y: -5 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16" />
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-12 -mb-12" />
                            <div className="relative z-10">
                                <div className="text-5xl mb-4">📊</div>
                                <h3 className="text-2xl font-bold mb-2">Take a Quiz</h3>
                                <p className="text-pink-100">Test your knowledge (Coming Soon)</p>
                            </div>
                        </motion.div>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}
