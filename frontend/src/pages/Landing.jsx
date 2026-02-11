import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Shield, Smartphone, Sparkles } from 'lucide-react';

export default function Landing() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-primary-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 text-gray-900 dark:text-white">
            <header className="max-w-6xl mx-auto px-4 py-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-3xl">🌊</span>
                    <div className="leading-tight">
                        <p className="text-xl font-bold">GyanDhara</p>
                        <p className="text-xs text-primary-600 dark:text-gray-400">ज्ञान धारा</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        to="/login"
                        className="px-4 py-2 rounded-lg font-semibold bg-white/80 dark:bg-gray-800 border border-primary-100 dark:border-gray-700 hover:bg-white active:scale-95"
                    >
                        Login
                    </Link>
                    <Link
                        to="/signup"
                        className="px-4 py-2 rounded-lg font-semibold bg-gradient-to-r from-primary-600 to-secondary-600 text-white shadow-lg hover:shadow-xl active:scale-95"
                    >
                        Sign Up
                    </Link>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 pb-16">
                <div className="grid lg:grid-cols-2 gap-10 items-center">
                    <div className="space-y-6">
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200 text-sm font-semibold"
                        >
                            <Sparkles size={16} /> Stream of knowledge for everyone
                        </motion.p>
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.1 }}
                            className="text-4xl sm:text-5xl font-black leading-tight"
                        >
                            Learn, read, and grow with curated books, lessons, and quizzes.
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.2 }}
                            className="text-lg text-gray-600 dark:text-gray-300 max-w-xl"
                        >
                            Dive into organized topics, track your streaks, and enjoy a smooth reading experience on any device.
                        </motion.p>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.3 }}
                            className="flex flex-col sm:flex-row gap-3"
                        >
                            <Link
                                to="/signup"
                                className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-semibold shadow-lg hover:shadow-xl active:scale-95 text-center"
                            >
                                Get Started
                            </Link>
                            <Link
                                to="/login"
                                className="px-6 py-3 rounded-lg border border-primary-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800 font-semibold hover:bg-white active:scale-95 text-center"
                            >
                                I have an account
                            </Link>
                        </motion.div>
                        <div className="grid sm:grid-cols-3 gap-4 pt-4">
                            <Feature icon={<BookOpen size={18} />} title="Curated PDFs" desc="Organized by themes & topics" />
                            <Feature icon={<Shield size={18} />} title="Secure" desc="Protected access with roles" />
                            <Feature icon={<Smartphone size={18} />} title="Mobile-first" desc="Optimized for phones" />
                        </div>
                    </div>
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative"
                    >
                        <div className="aspect-video rounded-3xl overflow-hidden shadow-2xl border border-primary-100 dark:border-gray-700 bg-gradient-to-br from-primary-600/10 to-secondary-600/10 flex items-center justify-center">
                            <div className="text-center space-y-3 px-6">
                                <p className="text-2xl font-bold">Fast PDF viewing</p>
                                <p className="text-gray-600 dark:text-gray-300">Smooth reading on desktop and mobile with fullscreen mode.</p>
                            </div>
                        </div>
                        <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-primary-200/60 rounded-full blur-3xl" aria-hidden />
                        <div className="absolute -top-6 -right-4 w-28 h-28 bg-secondary-200/60 rounded-full blur-3xl" aria-hidden />
                    </motion.div>
                </div>
            </main>
        </div>
    );
}

function Feature({ icon, title, desc }) {
    return (
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-gray-800 border border-primary-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 text-primary-700 dark:text-primary-200 font-semibold">
                {icon}
                <span>{title}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{desc}</p>
        </div>
    );
}
