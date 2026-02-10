import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { BookOpen, FileText, Download, User, Calendar, Loader } from 'lucide-react';

/**
 * BooksList - Shows multiple book cards when a topic has multiple books
 * This is used when clicking on a topic that has multiple PDFs/books
 */
export default function BooksList() {
    const { topicId } = useParams();
    const [books, setBooks] = useState([]);
    const [topic, setTopic] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTopic();
        loadBooks();
    }, [topicId]);

    const loadTopic = async () => {
        try {
            const response = await api.get(`/api/topics/${topicId}`);
            setTopic(response.data.topic);
        } catch (error) {
            console.error('Error loading topic:', error);
        }
    };

    const loadBooks = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/api/books/topic/${topicId}`);
            setBooks(response.data.books || []);
        } catch (error) {
            toast.error('Failed to load books');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                    <Loader className="w-12 h-12 text-primary-600" />
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 py-12">
            <div className="container mx-auto px-4">
                {/* Topic Header */}
                {topic && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-12"
                    >
                        <h1 className="text-5xl font-black mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            {topic.title}
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            {topic.summary || `Books available for ${topic.title}`}
                        </p>
                        <div className="mt-4">
                            <span className="inline-block px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full font-semibold">
                                {books.length} {books.length === 1 ? 'Book' : 'Books'} Available
                            </span>
                        </div>
                    </motion.div>
                )}

                {/* Books Grid */}
                {books.length === 0 ? (
                    <div className="text-center py-20">
                        <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                        <p className="text-xl text-gray-600 dark:text-gray-400">No books found for this topic</p>
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                            Upload books using the book upload form
                        </p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {books.map((book, index) => (
                            <motion.div
                                key={book.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ y: -8, scale: 1.02 }}
                            >
                                <Link to={`/topics/${topicId}?bookId=${book.id}&bookIndex=${index}`}>
                                    <div className="card cursor-pointer h-full flex flex-col dark:bg-gray-800 dark:border dark:border-gray-700 overflow-hidden">
                                        {/* Cover Image */}
                                        {book.cover_image_url ? (
                                            <div className="w-full h-96 overflow-hidden bg-gray-100 dark:bg-gray-700 rounded-t-lg">
                                                <img
                                                    src={`${import.meta.env.VITE_API_URL}${book.cover_image_url}`}
                                                    alt={book.title}
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-full h-96 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center rounded-t-lg">
                                                <BookOpen className="w-24 h-24 text-white opacity-50" />
                                            </div>
                                        )}

                                        {/* Book Details */}
                                        <div className="p-6 flex-1 flex flex-col">
                                            {/* Book Number Badge */}
                                            <div className="mb-3">
                                                <span className="inline-block px-3 py-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-sm font-bold">
                                                    Book {book.book_number}
                                                </span>
                                            </div>

                                            {/* Title */}
                                            <h3 className="text-2xl font-bold mb-3 text-gray-800 dark:text-white line-clamp-2">
                                                {book.title}
                                            </h3>

                                            {/* Description */}
                                            <p className="text-gray-600 dark:text-gray-400 mb-4 flex-1 line-clamp-3">
                                                {book.description || 'No description available'}
                                            </p>

                                            {/* Metadata */}
                                            <div className="space-y-2 mb-4">
                                                {book.author && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                        <User className="w-4 h-4" />
                                                        <span>{book.author}</span>
                                                    </div>
                                                )}

                                                {book.publication_year && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                        <Calendar className="w-4 h-4" />
                                                        <span>{book.publication_year}</span>
                                                    </div>
                                                )}

                                                {book.total_pages && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                        <FileText className="w-4 h-4" />
                                                        <span>{book.total_pages} pages</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Button */}
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                                            >
                                                <BookOpen className="w-5 h-5" />
                                                Read Book
                                            </motion.button>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
