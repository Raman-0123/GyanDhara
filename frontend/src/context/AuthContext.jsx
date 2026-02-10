import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

/**
 * Lightweight localStorage-based authentication
 * No backend auth required - perfect for student learning tracking
 */
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load user profile from localStorage
        const savedUser = localStorage.getItem('gyandhara_user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    /**
     * Create a lightweight user profile (no server signup)
     * Stores username and initializes streak data locally
     */
    const createProfile = (username, email = null) => {
        const newUser = {
            id: `local_${Date.now()}`,
            username,
            email,
            createdAt: new Date().toISOString(),
            streak: {
                current: 0,
                longest: 0,
                lastActive: null,
                history: [] // Array of dates ["2025-11-30", "2025-11-29", ...]
            },
            stats: {
                topicsCompleted: 0,
                quizzesTaken: 0,
                totalScore: 0,
                totalTime: 0 // in minutes
            },
            bookmarks: [], // Array of topic IDs
            achievements: [] // Array of achievement objects
        };

        localStorage.setItem('gyandhara_user', JSON.stringify(newUser));
        setUser(newUser);
        return newUser;
    };

    /**
     * Update user profile
     */
    const updateProfile = (updates) => {
        const updatedUser = { ...user, ...updates };
        localStorage.setItem('gyandhara_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
    };

    /**
     * Update streak - call this daily when user completes activities
     */
    const updateStreak = () => {
        if (!user) return;

        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const lastActive = user.streak.lastActive;

        let newStreak = { ...user.streak };

        if (lastActive === today) {
            // Already active today, no change
            return;
        }

        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        if (lastActive === yesterday) {
            // Continuing streak
            newStreak.current += 1;
            newStreak.longest = Math.max(newStreak.longest, newStreak.current);
        } else if (!lastActive || lastActive < yesterday) {
            // Streak broken, restart
            newStreak.current = 1;
        }

        newStreak.lastActive = today;
        newStreak.history = [...(newStreak.history || []), today];

        // Check for streak achievements
        const achievements = [...(user.achievements || [])];
        if (newStreak.current === 5 && !achievements.find(a => a.id === 'streak_5')) {
            achievements.push({ id: 'streak_5', name: '5-Day Streak', emoji: '🔥', unlockedAt: today });
        }
        if (newStreak.current === 10 && !achievements.find(a => a.id === 'streak_10')) {
            achievements.push({ id: 'streak_10', name: '10-Day Streak', emoji: '⭐', unlockedAt: today });
        }
        if (newStreak.current === 30 && !achievements.find(a => a.id === 'streak_30')) {
            achievements.push({ id: 'streak_30', name: '30-Day Streak', emoji: '💎', unlockedAt: today });
        }

        updateProfile({ streak: newStreak, achievements });
    };

    /**
     * Add a bookmark
     */
    const addBookmark = (topicId) => {
        if (!user) return;
        const bookmarks = [...(user.bookmarks || [])];
        if (!bookmarks.includes(topicId)) {
            bookmarks.push(topicId);
            updateProfile({ bookmarks });
        }
    };

    /**
     * Remove a bookmark
     */
    const removeBookmark = (topicId) => {
        if (!user) return;
        const bookmarks = (user.bookmarks || []).filter(id => id !== topicId);
        updateProfile({ bookmarks });
    };

    /**
     * Update quiz stats
     */
    const updateQuizStats = (score, timeSpent) => {
        if (!user) return;

        const stats = {
            ...user.stats,
            quizzesTaken: (user.stats.quizzesTaken || 0) + 1,
            totalScore: (user.stats.totalScore || 0) + score,
            totalTime: (user.stats.totalTime || 0) + Math.ceil(timeSpent / 60)
        };

        updateProfile({ stats });
        updateStreak(); // Update streak when completing quiz
    };

    /**
     * Mark topic as completed
     */
    const markTopicCompleted = (topicId) => {
        if (!user) return;

        const stats = {
            ...user.stats,
            topicsCompleted: (user.stats.topicsCompleted || 0) + 1
        };

        updateProfile({ stats });
        updateStreak(); // Update streak when completing topic
    };

    /**
     * Logout (clear profile)
     */
    const logout = () => {
        if (confirm('Are you sure you want to logout? Your progress is saved locally.')) {
            localStorage.removeItem('gyandhara_user');
            setUser(null);
        }
    };

    const value = {
        user,
        loading,
        createProfile,
        updateProfile,
        updateStreak,
        addBookmark,
        removeBookmark,
        updateQuizStats,
        markTopicCompleted,
        logout,
        isAuthenticated: !!user,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
