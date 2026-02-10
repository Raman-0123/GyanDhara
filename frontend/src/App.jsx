import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ThemeGallery from './pages/ThemeGallery';
import TopicList from './pages/TopicList';
import BooksList from './pages/BooksList';
import TopicReader from './pages/TopicReader';
import Dashboard from './pages/Dashboard';
import Bookmarks from './pages/Bookmarks';
import AdminPanel from './pages/AdminPanel';
import { useAuth } from './context/AuthContext';

function App() {
    return (
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
                <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
                    <Routes>
                        {/* Auth entry points (no navbar) */}
                        <Route path="/" element={<Login />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />

                        {/* Protected app with navbar */}
                        <Route element={<NavbarLayout />}>
                            <Route
                                path="/home"
                                element={<ProtectedRoute><Home /></ProtectedRoute>}
                            />
                            <Route
                                path="/themes"
                                element={<ProtectedRoute><ThemeGallery /></ProtectedRoute>}
                            />
                            <Route
                                path="/themes/:themeId"
                                element={<ProtectedRoute><TopicList /></ProtectedRoute>}
                            />
                            <Route
                                path="/topics/:topicId/books"
                                element={<ProtectedRoute><BooksList /></ProtectedRoute>}
                            />
                            <Route
                                path="/books"
                                element={<ProtectedRoute><BooksList /></ProtectedRoute>}
                            />
                            <Route
                                path="/topics/:id"
                                element={<ProtectedRoute><TopicReader /></ProtectedRoute>}
                            />
                            <Route
                                path="/dashboard"
                                element={<StudentRoute><Dashboard /></StudentRoute>}
                            />
                            <Route
                                path="/bookmarks"
                                element={<StudentRoute><Bookmarks /></StudentRoute>}
                            />
                            <Route
                                path="/admin"
                                element={<AdminRoute><AdminPanel /></AdminRoute>}
                            />
                        </Route>

                        <Route
                            path="*"
                            element={
                                <div className="min-h-screen flex items-center justify-center">
                                    <div className="text-center">
                                        <h1 className="text-6xl font-bold mb-4">404</h1>
                                        <p className="text-xl text-gray-600">Page not found</p>
                                    </div>
                                </div>
                            }
                        />
                    </Routes>
                    <Toaster position="top-right" />
                </div>
            </AuthProvider>
        </BrowserRouter>
    );
}

// Layout that injects Navbar for post-auth routes
function NavbarLayout() {
    return (
        <>
            <Navbar />
            <div className="pt-0">
                <Outlet />
            </div>
        </>
    );
}

// Generic auth guard
function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return null;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return children;
}

// Only students (non-admin) see student dashboard bits
function StudentRoute({ children }) {
    const { isAuthenticated, isAdmin, loading } = useAuth();
    if (loading) return null;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (isAdmin) return <Navigate to="/admin" replace />;
    return children;
}

// Only admins
function AdminRoute({ children }) {
    const { isAuthenticated, isAdmin, loading } = useAuth();
    if (loading) return null;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (!isAdmin) return <Navigate to="/dashboard" replace />;
    return children;
}

export default App;
