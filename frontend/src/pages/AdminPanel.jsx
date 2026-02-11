import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

function toErrorString(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'object' && typeof value.message === 'string') return value.message;
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

export default function AdminPanel() {
    const navigate = useNavigate();
    const { user, isAdmin, loading: authLoading } = useAuth();
    const [themes, setThemes] = useState([]);
    const [books, setBooks] = useState([]);
    const [booksLoading, setBooksLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [themesError, setThemesError] = useState('');
    const [booksError, setBooksError] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadStats, setUploadStats] = useState(null);
    const [formData, setFormData] = useState({
        theme_id: '',
        title: '',
        description: '',
        book_number: 1,
        author: '',
        publisher: '',
        publication_year: '',
        isbn: '',
        display_order: 1
    });
    const [pdfFile, setPdfFile] = useState(null);
    const [coverFile, setCoverFile] = useState(null);
    const [fileSize, setFileSize] = useState(0);
    const [selectedBook, setSelectedBook] = useState(null);
    const [editForm, setEditForm] = useState({
        title: '',
        description: '',
        book_number: 1,
        author: '',
        publisher: '',
        publication_year: '',
        isbn: '',
        display_order: 1,
        is_active: true
    });
    const [editPdfFile, setEditPdfFile] = useState(null);
    const [editCoverFile, setEditCoverFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const hasLoadedRef = useRef(false);
    const [migrating, setMigrating] = useState(false);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            hasLoadedRef.current = false;
            navigate('/login');
            return;
        }
        if (!isAdmin) {
            hasLoadedRef.current = false;
            navigate('/dashboard');
            return;
        }
        if (hasLoadedRef.current) return;
        hasLoadedRef.current = true;
        // Fetch data only after auth check passes
        fetchThemes();
        fetchUploadStats();
        fetchBooks();
    }, [user, isAdmin, authLoading, navigate]);

    // Data is loaded after admin auth check

    const fetchThemes = async () => {
        try {
            setThemesError('');
            const response = await api.get('/api/topics/themes');
            setThemes(response.data.themes || []);
        } catch (error) {
            const raw = error.response?.data?.message
                || error.response?.data?.error
                || error.message
                || 'Failed to fetch themes';
            const message = toErrorString(raw) || 'Failed to fetch themes';
            if (!themesError) toast.error(message);
            setThemesError(message);
            console.error(error);
        }
    };

    const fetchUploadStats = async () => {
        try {
            const response = await api.get('/api/github-releases/stats');
            setUploadStats(response.data.stats);
        } catch (error) {
            const raw = error.response?.data?.message
                || error.response?.data?.error
                || error.message
                || 'Failed to fetch stats';
            console.error('Failed to fetch stats:', error);
            // Never pass non-strings into toast - it can crash React in production builds.
            toast.error(toErrorString(raw) || 'Failed to fetch stats');
        }
    };

    const fetchBooks = async () => {
        try {
            setBooksError('');
            setBooksLoading(true);
            const response = await api.get('/api/github-releases/pdfs');
            setBooks(response.data.books || []);
        } catch (error) {
            console.error('Failed to fetch books:', error);
            const raw = error.response?.data?.message
                || error.response?.data?.error
                || error.message
                || 'Failed to load books';
            const message = toErrorString(raw) || 'Failed to load books';
            if (!booksError) toast.error(message);
            setBooksError(message);
        } finally {
            setBooksLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handlePDFChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPdfFile(file);
            const sizeMB = file.size / (1024 * 1024);
            setFileSize(sizeMB);

            // Validate file size
            if (sizeMB > 200) {
                toast.error(`PDF file size (${sizeMB.toFixed(2)}MB) exceeds 200MB maximum`);
            }
        }
    };

    const handleCoverChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const sizeMB = file.size / (1024 * 1024);
            if (sizeMB > 10) {
                toast.error('Cover image must be less than 10MB');
                return;
            }
            setCoverFile(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.theme_id || !formData.title || !pdfFile) {
            toast.error('Please fill in all required fields (Theme, Title, PDF)');
            return;
        }

        if (fileSize > 200) {
            toast.error('PDF file size must be 200MB or less');
            return;
        }

        setUploading(true);
        const uploadToast = toast.loading('Uploading PDF to GitHub Releases...');

        try {
            // If the PDF is larger than ~4MB, upload it to Supabase first to avoid Vercel body limits
            let storagePath = null;
            const pdfSizeMB = fileSize;
            if (pdfFile && pdfSizeMB > 4) {
                const path = `github-temp/${Date.now()}-${Math.round(Math.random() * 1e9)}-${pdfFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                const { error: uploadErr, data } = await supabase.storage
                    .from('books')
                    .upload(path, pdfFile, {
                        cacheControl: '3600',
                        upsert: true,
                        contentType: pdfFile.type || 'application/pdf'
                    });
                if (uploadErr) throw uploadErr;
                storagePath = data?.path || path;
            }

            // Create FormData
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                data.append(key, formData[key]);
            });
            if (storagePath) {
                data.append('storage_path', storagePath);
            } else {
                data.append('pdf', pdfFile);
            }
            if (coverFile) {
                data.append('cover_image', coverFile);
            }

            console.info('[AdminUpload] POST /api/github-releases/upload-pdf', {
                apiBaseURL: api.defaults?.baseURL,
                theme_id: formData.theme_id,
                title: formData.title,
                pdf: pdfFile ? { name: pdfFile.name, size: pdfFile.size, type: pdfFile.type } : null,
                cover: coverFile ? { name: coverFile.name, size: coverFile.size, type: coverFile.type } : null
            });

            // Upload to GitHub Releases API
            const response = await api.post('/api/github-releases/upload-pdf', data, {
                timeout: 300000 // 5 minute timeout for large files
            });

            toast.success('PDF uploaded successfully!', { id: uploadToast });

            // Reset form
            setFormData({
                theme_id: '',
                title: '',
                description: '',
                book_number: 1,
                author: '',
                publisher: '',
                publication_year: '',
                isbn: '',
                display_order: 1
            });
            setPdfFile(null);
            setCoverFile(null);
            setFileSize(0);
            document.getElementById('pdf-input').value = '';
            document.getElementById('cover-input').value = '';

            // Refresh stats
            fetchUploadStats();
            fetchBooks();

            // Show success details
            console.log('Upload response:', response.data);

        } catch (error) {
            console.error('[AdminUpload] error', {
                message: error?.message,
                status: error?.response?.status,
                data: error?.response?.data
            });
            const raw = error?.response?.data?.message
                || error?.response?.data?.error
                || error?.message
                || 'Upload failed';
            toast.error(toErrorString(raw) || 'Upload failed', { id: uploadToast });
        } finally {
            setUploading(false);
        }
    };

    const filteredBooks = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) return books;
        return books.filter((book) => {
            return (
                book.title?.toLowerCase().includes(query) ||
                book.author?.toLowerCase().includes(query) ||
                book.publisher?.toLowerCase().includes(query) ||
                book.isbn?.toLowerCase().includes(query)
            );
        });
    }, [books, searchTerm]);

    const openEditModal = (book) => {
        setSelectedBook(book);
        setEditForm({
            title: book.title || '',
            description: book.description || '',
            book_number: book.book_number || 1,
            author: book.author || '',
            publisher: book.publisher || '',
            publication_year: book.publication_year || '',
            isbn: book.isbn || '',
            display_order: book.display_order || 1,
            is_active: Boolean(book.is_active)
        });
        setEditPdfFile(null);
        setEditCoverFile(null);
    };

    const closeEditModal = () => {
        setSelectedBook(null);
        setEditPdfFile(null);
        setEditCoverFile(null);
    };

    const handleEditChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEditForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!selectedBook) return;

        try {
            setSaving(true);
            const formPayload = new FormData();
            Object.entries(editForm).forEach(([key, value]) => {
                formPayload.append(key, value);
            });
            if (editPdfFile) {
                const sizeMB = editPdfFile.size / (1024 * 1024);
                let storagePath = null;
                if (sizeMB > 4) {
                    const path = `github-temp/${Date.now()}-${Math.round(Math.random() * 1e9)}-${editPdfFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                    const { error: uploadErr, data } = await supabase.storage
                        .from('books')
                        .upload(path, editPdfFile, {
                            cacheControl: '3600',
                            upsert: true,
                            contentType: editPdfFile.type || 'application/pdf'
                        });
                    if (uploadErr) throw uploadErr;
                    storagePath = data?.path || path;
                }
                if (storagePath) {
                    formPayload.append('storage_path', storagePath);
                } else {
                    formPayload.append('pdf', editPdfFile);
                }
            }
            if (editCoverFile) formPayload.append('cover_image', editCoverFile);

            await api.put(`/api/github-releases/pdf/${selectedBook.id}`, formPayload, {
                timeout: 300000
            });

            toast.success('Book updated');
            closeEditModal();
            fetchBooks();
        } catch (error) {
            console.error('Update failed:', error);
            const raw = error.response?.data?.message || error.response?.data?.error || error.message;
            toast.error(toErrorString(raw) || 'Failed to update book');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (book) => {
        try {
            const formPayload = new FormData();
            formPayload.append('is_active', (!book.is_active).toString());
            await api.put(`/api/github-releases/pdf/${book.id}`, formPayload);
            fetchBooks();
        } catch (error) {
            console.error('Toggle failed:', error);
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async (book) => {
        if (!window.confirm(`Delete "${book.title}"? This cannot be undone.`)) return;
        try {
            await api.delete(`/api/github-releases/pdf/${book.id}`);
            toast.success('Book deleted');
            fetchBooks();
            fetchUploadStats();
        } catch (error) {
            console.error('Delete failed:', error);
            toast.error('Failed to delete book');
        }
    };

    const handleMigrateAll = async () => {
        if (!window.confirm('Migrate all non-GitHub PDFs to GitHub Releases?')) return;
        try {
            setMigrating(true);
            const response = await api.post('/api/github-releases/migrate-all');
            const { migrated, failed } = response.data;
            toast.success(`Migration complete. Migrated: ${migrated}, Failed: ${failed}`);
            fetchBooks();
            fetchUploadStats();
        } catch (error) {
            console.error('Migration failed:', error);
            const raw = error.response?.data?.message || error.response?.data?.error || error.message;
            toast.error(toErrorString(raw) || 'Migration failed');
        } finally {
            setMigrating(false);
        }
    };

    if (user && user.role !== 'admin') {
        return null;
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Admin Panel - Upload PDF
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Upload educational PDFs to GitHub Releases (50MB - 200MB)
                    </p>
                </div>

                {/* Upload Stats */}
                {uploadStats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                            <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total PDFs</div>
                            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{uploadStats.total_pdfs}</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                            <div className="text-sm text-green-600 dark:text-green-400 font-medium">GitHub Releases</div>
                            <div className="text-2xl font-bold text-green-900 dark:text-green-100">{uploadStats.github_releases}</div>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4">
                            <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">Supabase Storage</div>
                            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{uploadStats.supabase_storage}</div>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-4">
                            <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">Total Size</div>
                            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">{uploadStats.total_size_gb} GB</div>
                        </div>
                    </div>
                )}

                {/* Upload Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Theme Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Theme / Category <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="theme_id"
                            value={formData.theme_id}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">Select a theme...</option>
                            {themes.map(theme => (
                                <option key={theme.id} value={theme.id}>
                                    {(theme.icon ? `${theme.icon} ` : '') + (theme.name || 'Untitled Theme')}
                                </option>
                            ))}
                        </select>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            PDFs uploaded here will be stored under the selected theme.
                        </p>
                        {themesError && (
                            <p className="mt-2 text-xs text-red-500">{themesError}</p>
                        )}
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Book Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            required
                            placeholder="e.g., Social Studies Grade 10"
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Description
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            rows={3}
                            placeholder="Brief description of the book content..."
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                    </div>

                    {/* Metadata Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Book Number
                            </label>
                            <input
                                type="number"
                                name="book_number"
                                value={formData.book_number}
                                onChange={handleInputChange}
                                min="1"
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Display Order
                            </label>
                            <input
                                type="number"
                                name="display_order"
                                value={formData.display_order}
                                onChange={handleInputChange}
                                min="1"
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Publication Year
                            </label>
                            <input
                                type="number"
                                name="publication_year"
                                value={formData.publication_year}
                                onChange={handleInputChange}
                                placeholder="2024"
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Author, Publisher, ISBN */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Author
                            </label>
                            <input
                                type="text"
                                name="author"
                                value={formData.author}
                                onChange={handleInputChange}
                                placeholder="Author name"
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Publisher
                            </label>
                            <input
                                type="text"
                                name="publisher"
                                value={formData.publisher}
                                onChange={handleInputChange}
                                placeholder="Publisher name"
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                ISBN
                            </label>
                            <input
                                type="text"
                                name="isbn"
                                value={formData.isbn}
                                onChange={handleInputChange}
                                placeholder="ISBN-13"
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* PDF File Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            PDF File (max 200MB) <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="pdf-input"
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={handlePDFChange}
                            required
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {fileSize > 0 && (
                            <p className={`mt-2 text-sm ${fileSize <= 200 ? 'text-green-600' : 'text-red-600'}`}>
                                File size: {fileSize.toFixed(2)} MB
                                {fileSize > 200 && ' (Too large - maximum 200MB)'}
                            </p>
                        )}
                    </div>

                    {/* Cover Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Cover Image (Optional, max 10MB)
                        </label>
                        <input
                            id="cover-input"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleCoverChange}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="flex gap-4">
                        <button
                            type="submit"
                            disabled={uploading || fileSize > 200}
                            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 px-6 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                            {uploading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Uploading to GitHub Releases...
                                </span>
                            ) : (
                                'Upload PDF'
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard')}
                            className="px-6 py-4 border border-gray-300 dark:border-gray-600 rounded-lg font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>

                {/* Info Box */}
                <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">GitHub Releases Storage</h3>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                        <li>• PDFs stored permanently in GitHub Releases (up to 2GB per file)</li>
                        <li>• Metadata saved in Supabase database</li>
                        <li>• Files accessible via permanent download URLs</li>
                        <li>• Automatic organization by themes/categories</li>
                    </ul>
                </div>

                {/* Manage Books */}
                <div className="mt-12">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Books</h2>
                        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by title, author, publisher, ISBN"
                                className="w-full md:w-72 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                            <button
                                type="button"
                                onClick={handleMigrateAll}
                                disabled={migrating}
                                className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {migrating ? 'Migrating...' : 'Migrate to GitHub'}
                            </button>
                        </div>
                    </div>

                    {booksLoading ? (
                        <div className="py-8 text-center text-gray-600 dark:text-gray-300">Loading books...</div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Title</th>
                                        <th className="px-4 py-3 text-left">Author</th>
                                        <th className="px-4 py-3 text-left">Size</th>
                                        <th className="px-4 py-3 text-left">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredBooks.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                                                No books found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredBooks.map((book) => (
                                            <tr key={book.id} className="bg-white dark:bg-gray-800">
                                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                                    {book.title}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                    {book.author || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                    {book.file_size_bytes ? `${(book.file_size_bytes / (1024 * 1024)).toFixed(2)} MB` : '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${book.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                                        {book.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right space-x-2">
                                                    <button
                                                        onClick={() => openEditModal(book)}
                                                        className="px-3 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleActive(book)}
                                                        className="px-3 py-1 rounded-md bg-amber-500 text-white hover:bg-amber-600"
                                                    >
                                                        {book.is_active ? 'Disable' : 'Enable'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(book)}
                                                        className="px-3 py-1 rounded-md bg-red-600 text-white hover:bg-red-700"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {booksError && (
                        <p className="mt-3 text-sm text-red-500">{booksError}</p>
                    )}
                </div>
            </div>

            {selectedBook && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl p-6 overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit Book</h3>
                            <button onClick={closeEditModal} className="text-gray-500 hover:text-gray-800">✕</button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
                                <input
                                    name="title"
                                    value={editForm.title}
                                    onChange={handleEditChange}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                                <textarea
                                    name="description"
                                    value={editForm.description}
                                    onChange={handleEditChange}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Book Number</label>
                                    <input
                                        type="number"
                                        name="book_number"
                                        value={editForm.book_number}
                                        onChange={handleEditChange}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Display Order</label>
                                    <input
                                        type="number"
                                        name="display_order"
                                        value={editForm.display_order}
                                        onChange={handleEditChange}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Publication Year</label>
                                    <input
                                        type="number"
                                        name="publication_year"
                                        value={editForm.publication_year}
                                        onChange={handleEditChange}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Author</label>
                                    <input
                                        name="author"
                                        value={editForm.author}
                                        onChange={handleEditChange}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Publisher</label>
                                    <input
                                        name="publisher"
                                        value={editForm.publisher}
                                        onChange={handleEditChange}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ISBN</label>
                                    <input
                                        name="isbn"
                                        value={editForm.isbn}
                                        onChange={handleEditChange}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Replace PDF (max 200MB)</label>
                                    <input
                                        type="file"
                                        accept=".pdf,application/pdf"
                                        onChange={(e) => setEditPdfFile(e.target.files[0] || null)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Replace Cover (max 10MB)</label>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,image/webp"
                                        onChange={(e) => setEditCoverFile(e.target.files[0] || null)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    name="is_active"
                                    checked={editForm.is_active}
                                    onChange={handleEditChange}
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeEditModal}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
