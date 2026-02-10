import { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import api from '../services/api';

const AuthContext = createContext(null);

// Initialize Supabase client
const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch user profile with role from database
    const fetchUserProfile = async (authUser) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, email, name, role')
                .eq('id', authUser.id)
                .single();

            if (error) throw error;

            return {
                ...authUser,
                ...data,
                role: data?.role || 'student'
            };
        } catch (error) {
            console.error('Failed to fetch user profile from Supabase:', error);
            return {
                ...authUser,
                role: 'student' // Default role
            };
        }
    };

    useEffect(() => {
        // Check for existing session
        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                const userWithRole = await fetchUserProfile(session.user);
                setUser(userWithRole);
                localStorage.setItem('token', session.access_token);
                localStorage.setItem('user', JSON.stringify(userWithRole));
            } else {
                // Clear localStorage if no session
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }

            setLoading(false);
        };

        initAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session) {
                const userWithRole = await fetchUserProfile(session.user);
                setUser(userWithRole);
                localStorage.setItem('token', session.access_token);
                localStorage.setItem('user', JSON.stringify(userWithRole));
            } else {
                setUser(null);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    const value = {
        user,
        loading,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        supabase, // Expose supabase client for direct use
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
