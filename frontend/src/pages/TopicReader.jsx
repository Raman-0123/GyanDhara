import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../services/api';
import PDFViewer from '../components/PDFViewer';
import { useAuth } from '../context/AuthContext';

const TopicReader = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Get URL parameters
    const searchParams = new URLSearchParams(window.location.search);
    const bookIndexParam = searchParams.get('bookIndex');

    const [topic, setTopic] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [books, setBooks] = useState([]);
    const [currentBookIndex, setCurrentBookIndex] = useState(bookIndexParam ? parseInt(bookIndexParam) : 0);
    const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pdf'); // Default to PDF tab
    const [showPDFModal, setShowPDFModal] = useState(false);

    // Translation state
    const [selectedLanguage, setSelectedLanguage] = useState('original');
    const [translating, setTranslating] = useState(false);
    const [translatedContent, setTranslatedContent] = useState({});
    const [availableLanguages, setAvailableLanguages] = useState([]);

    // Quiz state
    const [quizAnswers, setQuizAnswers] = useState({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [quizResult, setQuizResult] = useState(null);

    // Rating state
    const [userRating, setUserRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [ratingComment, setRatingComment] = useState('');
    const [ratings, setRatings] = useState([]);

    const apiBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3000');

    const resolveAssetUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        return `${apiBaseUrl}${url}`;
    };

    const getBookPdfUrl = (book) => {
        if (!book) return '';
        if (book.storage_type === 'github_release' && book.github_asset_id) {
            // Default to fast redirect (uses GitHub's CDN). Proxy mode available via query param if ever needed.
            return `${apiBaseUrl}/api/github-releases/asset/${book.github_asset_id}`;
        }
        return resolveAssetUrl(book.pdf_url);
    };

    useEffect(() => {
        fetchTopic();
        fetchLessons();
        fetchBooks();
        fetchLanguages();
    }, [id]);

    useEffect(() => {
        if (activeTab === 'ratings') {
            fetchRatings();
        }
    }, [activeTab]);

    const fetchTopic = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/api/topics/${id}`);
            setTopic(response.data);

            if (response.data.quiz?.questions) {
                const initialAnswers = {};
                response.data.quiz.questions.forEach((_, index) => {
                    initialAnswers[index] = null;
                });
                setQuizAnswers(initialAnswers);
            }
        } catch (error) {
            console.error('Error fetching topic:', error);
            toast.error('Failed to load topic');
            navigate('/themes');
        } finally {
            setLoading(false);
        }
    };

    const fetchLessons = async () => {
        try {
            const response = await api.get(`/api/lessons/topic/${id}`);
            setLessons(response.data.lessons || []);
        } catch (error) {
            console.error('Error fetching lessons:', error);
        }
    };

    const fetchBooks = async () => {
        try {
            const response = await api.get(`/api/books/topic/${id}`);
            setBooks(response.data.books || []);
        } catch (error) {
            console.error('Error fetching books:', error);
        }
    };

    const fetchLanguages = async () => {
        try {
            const response = await api.get('/api/translate/languages');
            setAvailableLanguages(response.data.languages || []);
        } catch (error) {
            console.error('Error fetching languages:', error);
        }
    };

    const fetchRatings = async () => {
        try {
            const response = await api.get(`/api/ratings/topic/${id}`);
            setRatings(response.data.ratings || []);
        } catch (error) {
            console.error('Error fetching ratings:', error);
        }
    };

    const handleLanguageChange = async (langCode) => {
        if (langCode === 'original') {
            setSelectedLanguage('original');
            return;
        }

        const currentLesson = lessons[currentLessonIndex];
        if (!currentLesson) return;

        // Check if already cached
        if (currentLesson.translations && currentLesson.translations[langCode]) {
            setTranslatedContent(currentLesson.translations[langCode]);
            setSelectedLanguage(langCode);
            return;
        }

        try {
            setTranslating(true);
            const response = await api.post('/api/translate/lesson', {
                lessonId: currentLesson.id,
                targetLang: langCode
            });

            setTranslatedContent(response.data.translation);
            setSelectedLanguage(langCode);

            if (response.data.cached) {
                toast.success('Translation loaded from cache');
            } else {
                toast.success('Translation completed!');
            }
        } catch (error) {
            console.error('Translation error:', error);
            toast.error('Translation failed. Please try again.');
        } finally {
            setTranslating(false);
        }
    };

    const goToNextLesson = () => {
        if (currentLessonIndex < lessons.length - 1) {
            setCurrentLessonIndex(currentLessonIndex + 1);
            setSelectedLanguage('original'); // Reset to original on lesson change
            setTranslatedContent({});
        }
    };

    const goToPreviousLesson = () => {
        if (currentLessonIndex > 0) {
            setCurrentLessonIndex(currentLessonIndex - 1);
            setSelectedLanguage('original');
            setTranslatedContent({});
        }
    };

    const handleQuizAnswer = (questionIndex, optionIndex) => {
        if (quizSubmitted) return;
        setQuizAnswers(prev => ({
            ...prev,
            [questionIndex]: optionIndex
        }));
    };

    const handleQuizSubmit = async () => {
        if (!user) {
            toast.error('Please login to submit quiz');
            return;
        }

        const allAnswered = Object.values(quizAnswers).every(answer => answer !== null);
        if (!allAnswered) {
            toast.error('Please answer all questions');
            return;
        }

        try {
            const response = await api.post('/api/quiz/submit', {
                topicId: id,
                quizId: topic.quiz.id,
                answers: Object.values(quizAnswers)
            });

            setQuizResult(response.data);
            setQuizSubmitted(true);
            toast.success(`Score: ${response.data.score}%`);
        } catch (error) {
            toast.error('Failed to submit quiz');
        }
    };

    const handleRatingSubmit = async () => {
        if (!user) {
            toast.error('Please login to rate');
            return;
        }

        if (userRating === 0) {
            toast.error('Please select a rating');
            return;
        }

        try {
            await api.post('/api/ratings', {
                topicId: id,
                rating: userRating,
                comment: ratingComment
            });

            toast.success('Rating submitted!');
            setUserRating(0);
            setRatingComment('');
            fetchRatings();
            fetchTopic();
        } catch (error) {
            toast.error('Failed to submit rating');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!topic) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4 dark:text-white">Topic not found</h2>
                    <button onClick={() => navigate('/themes')} className="text-blue-600 hover:underline">
                        Back to Themes
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                ← Back
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {topic.title}
                                </h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {topic.theme_name}
                                </p>
                            </div>
                        </div>

                        {/* Language Selector */}
                        {activeTab === 'lessons' && lessons.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Language:</span>
                                <select
                                    value={selectedLanguage}
                                    onChange={(e) => handleLanguageChange(e.target.value)}
                                    disabled={translating}
                                    className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                                >
                                    <option value="original">Original</option>
                                    {availableLanguages.map(lang => (
                                        <option key={lang.code} value={lang.code}>
                                            {lang.name}
                                        </option>
                                    ))}
                                </select>
                                {translating && (
                                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex gap-1">
                        {['lessons', 'pdf', 'quiz', 'ratings'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-3 font-semibold capitalize ${activeTab === tab
                                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                {tab === 'lessons' ? '📚 Lessons' :
                                    tab === 'pdf' ? '📄 PDF' :
                                        tab === 'quiz' ? '🎯 Quiz' : '⭐ Ratings'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                {activeTab === 'lessons' && (
                    <div className="flex gap-6">
                        {/* Left Sidebar - Lessons List */}
                        <div className="w-80 flex-shrink-0">
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                                    Course Content
                                </h2>
                                {lessons.length === 0 ? (
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                                        No lessons available yet
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {lessons.map((lesson, index) => (
                                            <button
                                                key={lesson.id}
                                                onClick={() => {
                                                    setCurrentLessonIndex(index);
                                                    setSelectedLanguage('original');
                                                    setTranslatedContent({});
                                                }}
                                                className={`w-full text-left p-3 rounded-lg transition-colors ${currentLessonIndex === index
                                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                                                    : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-2">
                                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center mt-0.5">
                                                        {index + 1}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm font-semibold ${currentLessonIndex === index
                                                            ? 'text-blue-700 dark:text-blue-300'
                                                            : 'text-gray-900 dark:text-white'
                                                            }`}>
                                                            {lesson.title}
                                                        </p>
                                                        {lesson.audio_url && (
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                🎵 Audio available
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Content - Lesson Display */}
                        <div className="flex-1 min-w-0">
                            {lessons.length === 0 ? (
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
                                    <div className="text-6xl mb-4">📚</div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                        No Lessons Yet
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        Lessons for this topic will appear here
                                    </p>
                                </div>
                            ) : (
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentLessonIndex}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.3 }}
                                        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8"
                                    >
                                        {/* Lesson Title */}
                                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                                            {selectedLanguage === 'original'
                                                ? lessons[currentLessonIndex].title
                                                : translatedContent.title || lessons[currentLessonIndex].title}
                                        </h2>

                                        {/* Audio Player */}
                                        {lessons[currentLessonIndex].audio_url && (
                                            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="text-2xl">🎵</span>
                                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                        Audio Lesson
                                                    </span>
                                                </div>
                                                <audio
                                                    controls
                                                    className="w-full"
                                                    src={`${import.meta.env.VITE_API_URL}${lessons[currentLessonIndex].audio_url}`}
                                                >
                                                    Your browser does not support audio playback.
                                                </audio>
                                            </div>
                                        )}

                                        {/* Lesson Content */}
                                        <div className="prose prose-lg dark:prose-invert max-w-none mb-8">
                                            {selectedLanguage === 'original' ? (
                                                <div
                                                    className="space-y-4 text-lg leading-relaxed text-justify"
                                                    dangerouslySetInnerHTML={{
                                                        __html: lessons[currentLessonIndex].content_html
                                                    }}
                                                />
                                            ) : (
                                                <div className="whitespace-pre-wrap space-y-4 text-lg leading-relaxed text-justify">
                                                    {translatedContent.content || lessons[currentLessonIndex].content_text}
                                                </div>
                                            )}
                                        </div>

                                        {/* Images */}
                                        {lessons[currentLessonIndex].images && lessons[currentLessonIndex].images.length > 0 && (
                                            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {lessons[currentLessonIndex].images.map((image, idx) => (
                                                    <div key={idx} className="rounded-lg overflow-hidden shadow-md">
                                                        <img
                                                            src={`${import.meta.env.VITE_API_URL}${image.url}`}
                                                            alt={image.caption || `Image ${idx + 1}`}
                                                            className="w-full h-auto"
                                                        />
                                                        {image.caption && (
                                                            <p className="text-sm text-gray-600 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-700">
                                                                {image.caption}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Navigation Buttons */}
                                        <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
                                            <button
                                                onClick={goToPreviousLesson}
                                                disabled={currentLessonIndex === 0}
                                                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${currentLessonIndex === 0
                                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                                                    }`}
                                            >
                                                ← Previous Lesson
                                            </button>

                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                Lesson {currentLessonIndex + 1} of {lessons.length}
                                            </div>

                                            <button
                                                onClick={goToNextLesson}
                                                disabled={currentLessonIndex === lessons.length - 1}
                                                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${currentLessonIndex === lessons.length - 1
                                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                                                    }`}
                                            >
                                                Next Lesson →
                                            </button>
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'pdf' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                        {books.length > 0 ? (
                            <div>
                                {/* Book Selector */}
                                {books.length > 1 && (
                                    <div className="mb-6">
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            Select Book:
                                        </label>
                                        <select
                                            value={currentBookIndex}
                                            onChange={(e) => setCurrentBookIndex(parseInt(e.target.value))}
                                            className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                                        >
                                            {books.map((book, index) => (
                                                <option key={book.id} value={index}>
                                                    {book.title} {book.book_number ? `(Book ${book.book_number})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                            📄 {books[currentBookIndex].title}
                                        </h2>
                                        {books[currentBookIndex].author && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                By {books[currentBookIndex].author}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setShowPDFModal(true)}
                                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg shadow-lg"
                                    >
                                        🖥️ Fullscreen
                                    </button>
                                </div>
                                <div className="w-full h-[800px] border-4 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                    <iframe
                                        src={getBookPdfUrl(books[currentBookIndex])}
                                        className="w-full h-full"
                                        title="PDF Viewer"
                                    />
                                </div>
                            </div>
                        ) : topic.pdf_url ? (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        📄 {topic.pdf_filename || 'Document'}
                                    </h2>
                                    <button
                                        onClick={() => setShowPDFModal(true)}
                                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg shadow-lg"
                                    >
                                        🖥️ Fullscreen
                                    </button>
                                </div>
                                <div className="w-full h-[800px] border-4 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                    <iframe
                                        src={resolveAssetUrl(topic.pdf_url)}
                                        className="w-full h-full"
                                        title="PDF Viewer"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <div className="text-6xl mb-4">📄</div>
                                <p className="text-xl text-gray-600 dark:text-gray-400">No books or PDF available</p>
                                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Upload books using the book upload form</p>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'quiz' && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                        <p className="text-center py-20 text-xl text-gray-600 dark:text-gray-400">Quiz feature coming soon!</p>
                    </div>
                )}

                {activeTab === 'ratings' && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                        <p className="text-center py-20 text-xl text-gray-600 dark:text-gray-400">Ratings feature coming soon!</p>
                    </div>
                )}

                <PDFViewer
                    pdfUrl={books.length > 0
                        ? getBookPdfUrl(books[currentBookIndex])
                        : resolveAssetUrl(topic.pdf_url)
                    }
                    isOpen={showPDFModal}
                    onClose={() => setShowPDFModal(false)}
                />
            </div>
        </div>
    );
};

export default TopicReader;
