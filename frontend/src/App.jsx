import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

function App() {
    return (
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
                <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
                    <Navbar />
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/themes" element={<ThemeGallery />} />
                        <Route path="/themes/:themeId" element={<TopicList />} />
                        <Route path="/topics/:topicId/books" element={<BooksList />} />
                        <Route path="/books" element={<BooksList />} />
                        <Route path="/topics/:id" element={<TopicReader />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/bookmarks" element={<Bookmarks />} />
                        <Route path="/admin" element={<AdminPanel />} />
                        <Route path="*" element={
                            <div className="min-h-screen flex items-center justify-center">
                                <div className="text-center">
                                    <h1 className="text-6xl font-bold mb-4">404</h1>
                                    <p className="text-xl text-gray-600">Page not found</p>
                                </div>
                            </div>
                        } />
                    </Routes>
                    <Toaster position="top-right" />
                </div>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
