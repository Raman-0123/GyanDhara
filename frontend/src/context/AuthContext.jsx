import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext(null);

const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || 'iamramanjot444@gmail.com').toLowerCase();


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

    const buildBaseUser = (authUser) => ({
        ...authUser,
        name: authUser?.user_metadata?.name || authUser?.email,
        // UI-only role derivation; authorization happens on the backend.
        role: authUser?.user_metadata?.role || (authUser?.email?.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'student'),
        is_active: true
    });

    // Fetch user profile with role from database
    const fetchUserProfile = async (authUser) => {
        try {
            console.info('[Auth] fetchUserProfile start', { userId: authUser?.id });
            let profileError = null;
            let profileData = null;

            // First attempt: full columns (newer schema)
            const { data, error } = await supabase
                .from('users')
                .select('id, email, name, full_name, role, is_active')
                .eq('id', authUser.id)
                .limit(1);

            profileError = error;
            profileData = Array.isArray(data) ? data[0] : null;

            // Fallback for older schemas missing some columns
            if (profileError?.code === '42703') {
                const fallback = await supabase
                    .from('users')
                    .select('id, email, role, is_active')
                    .eq('id', authUser.id)
                    .limit(1);

                profileError = fallback.error;
                profileData = Array.isArray(fallback.data) ? fallback.data[0] : null;
            }

            if (profileError) throw profileError;

            const safeProfile = profileData || {};

            console.info('[Auth] fetchUserProfile done', {
                userId: authUser?.id,
                hasProfile: Boolean(profileData),
                errorCode: profileError?.code
            });

            const derivedRole = safeProfile.role
                || authUser?.user_metadata?.role
                || (authUser?.email?.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'student');

            return {
                ...authUser,
                ...safeProfile,
                name: safeProfile.name || safeProfile.full_name || authUser.user_metadata?.name || authUser.email,
                role: derivedRole,
                is_active: safeProfile.is_active ?? true
            };
        } catch (error) {
            console.error('Failed to fetch user profile from Supabase:', error);
            return buildBaseUser(authUser);
        }
    };

    useEffect(() => {
        let cancelled = false;

        const hydrateUser = async (authUser) => {
            const timeoutMs = 8000;
            try {
                const result = await Promise.race([
                    fetchUserProfile(authUser),
                    new Promise((_, reject) => setTimeout(() => reject(new Error(`fetchUserProfile timeout after ${timeoutMs}ms`)), timeoutMs)),
                ]);

                if (cancelled) return;
                setUser(result);
                localStorage.setItem('user', JSON.stringify(result));
            } catch (err) {
                console.error('[Auth] hydrateUser failed:', err);
            }
        };

        // Check for existing session
        const initAuth = async () => {
            try {
                console.info('[Auth] initAuth start');
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (session) {
                    console.info('[Auth] session found', { userId: session.user?.id });
                    const baseUser = buildBaseUser(session.user);
                    setUser(baseUser);
                    localStorage.setItem('token', session.access_token);
                    localStorage.setItem('user', JSON.stringify(baseUser));

                    // Hydrate role/profile in the background (don't block UI)
                    hydrateUser(session.user);
                } else {
                    console.info('[Auth] no session, clearing storage');
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            } catch (err) {
                console.error('Auth init failed:', err);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setLoading(false);
                return;
            }
            setLoading(false);
        };

        initAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.info('[Auth] onAuthStateChange', event, { hasSession: !!session });
            if (session) {
                const baseUser = buildBaseUser(session.user);
                setUser(baseUser);
                localStorage.setItem('token', session.access_token);
                localStorage.setItem('user', JSON.stringify(baseUser));

                // Hydrate role/profile in the background (don't block auth flow)
                hydrateUser(session.user);
            } else {
                setUser(null);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }

            // If a sign-in/out happens before initAuth completes, don't keep the UI stuck in "loading".
            setLoading(false);
        });

        return () => {
            cancelled = true;
            subscription.unsubscribe();
        };
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
