import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Home, Sparkles, Menu, X } from 'lucide-react';
import DarkModeToggle from './DarkModeToggle';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export default function Navbar() {
    const { user, logout, isAuthenticated, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        setIsMobileMenuOpen(false);
        navigate('/login');
    };

    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    return (
        <>
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

                        {/* Desktop Navigation Links */}
                        <div className="hidden md:flex items-center space-x-6">
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
                                    className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-sm font-semibold active:scale-95"
                                >
                                    Logout
                                </motion.button>
                            )}

                            {/* Dark Mode Toggle */}
                            <DarkModeToggle />
                        </div>

                        {/* Mobile Menu Button & Dark Mode */}
                        <div className="flex md:hidden items-center space-x-3">
                            <DarkModeToggle />
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="p-2 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors"
                                aria-label="Toggle mobile menu"
                            >
                                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/50 z-40 md:hidden"
                            onClick={closeMobileMenu}
                        />

                        {/* Slide-out Drawer */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'tween', duration: 0.3 }}
                            className="fixed top-16 right-0 bottom-0 w-64 bg-gradient-to-b from-primary-600 to-purple-700 dark:from-gray-800 dark:to-gray-900 shadow-2xl z-50 md:hidden overflow-y-auto"
                        >
                            <div className="flex flex-col p-6 space-y-4">
                                <Link
                                    to="/home"
                                    onClick={closeMobileMenu}
                                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors text-white font-medium"
                                >
                                    <Home size={20} />
                                    <span>Home</span>
                                </Link>

                                <Link
                                    to="/themes"
                                    onClick={closeMobileMenu}
                                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors text-white font-medium"
                                >
                                    <Sparkles size={20} />
                                    <span>Themes</span>
                                </Link>

                                {isAuthenticated && (
                                    <Link
                                        to={isAdmin ? '/admin' : '/dashboard'}
                                        onClick={closeMobileMenu}
                                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors text-white font-medium"
                                    >
                                        <User size={20} />
                                        <span>{isAdmin ? 'Admin' : 'Profile'}</span>
                                    </Link>
                                )}

                                {isAuthenticated && (
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center justify-center w-full p-3 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors text-white font-semibold"
                                    >
                                        Logout
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
