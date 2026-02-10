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

    useEffect(() => {
        // Check for existing session
        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                setUser(session.user);
                localStorage.setItem('token', session.access_token);
                localStorage.setItem('user', JSON.stringify(session.user));
            } else {
                // Clear localStorage if no session
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
            
            setLoading(false);
        };

        initAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                setUser(session.user);
                localStorage.setItem('token', session.access_token);
                localStorage.setItem('user', JSON.stringify(session.user));
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
        supabase, // Expose supabase client for direct use
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
