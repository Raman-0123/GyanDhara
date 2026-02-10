import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabaseClient';
import { LogIn, Mail, Lock, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || 'iamramanjot444@gmail.com').toLowerCase();

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        // Redirect based on role after session loads
        if (user.role === 'admin') {
            navigate('/admin');
        } else {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (loading) return;

        const normalizedEmail = email.trim().toLowerCase();
        const pwd = password.trim();
        if (!normalizedEmail || !pwd) {
            toast.error('Please enter email and password');
            return;
        }

        setLoading(true);
        console.info('[Login] Submitting login', { email: normalizedEmail });

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password: pwd,
            });

            console.info('[Login] Supabase response', { session: !!data?.session, user: data?.user?.id });
            if (error) throw error;
            if (!data?.session || !data?.user) {
                throw new Error('Login failed: no session returned');
            }

            // Store token and user data temporarily
            localStorage.setItem('token', data.session.access_token);
            console.info('[Login] Token stored length', data.session.access_token?.length);

            // Avoid calling public.users directly from the browser (can be blocked by RLS and return noisy 406s).
            // We'll route using admin email + metadata, and AuthContext will hydrate role/profile after login.
            const derivedRole = data.user.user_metadata?.role
                || (normalizedEmail === ADMIN_EMAIL ? 'admin' : 'student');
            const userForStorage = {
                ...data.user,
                name: data.user.user_metadata?.name || data.user.email,
                role: derivedRole,
                is_active: true,
            };

            console.info('[Login] Derived role', derivedRole);
            localStorage.setItem('user', JSON.stringify(userForStorage));

            toast.success('Welcome back! 🎉');

            // Route by role
            if (derivedRole === 'admin') {
                console.info('[Login] Navigating to /admin');
                navigate('/admin');
            } else {
                console.info('[Login] Navigating to /dashboard');
                navigate('/dashboard');
            }
        } catch (error) {
            console.error('Login error:', error);
            const msg = error?.name === 'AbortError'
                ? 'Login request timed out. Check Network tab / adblock / VPN, then retry.'
                : (error.message || 'Failed to login');
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
                        <BookOpen className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        GyanDhara
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        ज्ञान धारा - Stream of Knowledge
                    </p>
                </div>

                {/* Login Form */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                        Welcome Back
                    </h2>

                    <form onSubmit={handleLogin} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Logging in...
                                </>
                            ) : (
                                <>
                                    <LogIn className="w-5 h-5" />
                                    Login
                                </>
                            )}
                        </button>
                    </form>

                    {/* Signup Link */}
                    <p className="text-center text-gray-600 dark:text-gray-400 mt-6">
                        Don't have an account?{' '}
                        <Link to="/signup" className="text-blue-500 hover:text-blue-600 font-medium">
                            Sign Up
                        </Link>
                    </p>
                </div>

            </div>
        </div>
    );
}
