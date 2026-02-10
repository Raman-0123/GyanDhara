import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Home, Sparkles } from 'lucide-react';
import DarkModeToggle from './DarkModeToggle';
import { motion } from 'framer-motion';

export default function Navbar() {
    const { user, logout, isAuthenticated, isAdmin } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <nav className="bg-gradient-to-r from-primary-600 via-primary-700 to-purple-700 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 text-white shadow-xl sticky top-0 z-50 backdrop-blur-sm border-b border-primary-500 dark:border-gray-700 transition-colors duration-300">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link to="/home" className="flex items-center space-x-2 hover:opacity-90 transition group">
                        <motion.span
                            className="text-3xl"
                            animate={{ rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >🌊</motion.span>
                        <div className="flex flex-col">
                            <span className="text-xl font-bold group-hover:text-yellow-300 transition-colors">GyanDhara</span>
                            <span className="text-xs text-primary-200 dark:text-gray-400 -mt-1 group-hover:text-yellow-200 transition-colors">ज्ञान धारा</span>
                        </div>
                    </Link>

                    {/* Navigation Links */}
                    <div className="flex items-center space-x-6">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Link
                                to="/home"
                                className="flex items-center space-x-1 hover:text-yellow-300 dark:hover:text-yellow-400 transition-colors font-medium"
                            >
                                <Home size={18} />
                                <span>Home</span>
                            </Link>
                        </motion.div>

                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Link
                                to="/themes"
                                className="flex items-center space-x-1 hover:text-yellow-300 dark:hover:text-yellow-400 transition-colors font-medium"
                            >
                                <Sparkles size={18} />
                                <span>Themes</span>
                            </Link>
                        </motion.div>

                        {isAuthenticated && (
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Link
                                    to={isAdmin ? '/admin' : '/dashboard'}
                                    className="flex items-center space-x-1 hover:text-yellow-300 dark:hover:text-yellow-400 transition-colors font-medium"
                                >
                                    <User size={18} />
                                    <span>{isAdmin ? 'Admin' : 'Profile'}</span>
                                </Link>
                            </motion.div>
                        )}

                        {isAuthenticated && (
                            <motion.button
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                onClick={handleLogout}
                                className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-sm font-semibold"
                            >
                                Logout
                            </motion.button>
                        )}

                        {/* Dark Mode Toggle */}
                        <DarkModeToggle />
                    </div>
                </div>
            </div>
        </nav>
    );
}
