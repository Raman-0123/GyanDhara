import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AdminPanel() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadStats, setUploadStats] = useState(null);
    const [formData, setFormData] = useState({
        topic_id: '',
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

    // Check if user is admin
    useEffect(() => {
        if (user && user.role !== 'admin') {
            toast.error('Access denied: Admin only');
            navigate('/dashboard');
        }
    }, [user, navigate]);

    // Fetch topics for the dropdown
    useEffect(() => {
        fetchTopics();
        fetchUploadStats();
    }, []);

    const fetchTopics = async () => {
        try {
            const response = await api.get('/topics');
            setTopics(response.data.topics || response.data);
        } catch (error) {
            toast.error('Failed to fetch topics');
            console.error(error);
        }
    };

    const fetchUploadStats = async () => {
        try {
            const response = await api.get('/github-releases/stats');
            setUploadStats(response.data.stats);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
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
            if (sizeMB < 50) {
                toast.error(`PDF file size (${sizeMB.toFixed(2)}MB) is less than 50MB minimum`);
            } else if (sizeMB > 200) {
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
        if (!formData.topic_id || !formData.title || !pdfFile) {
            toast.error('Please fill in all required fields (Topic, Title, PDF)');
            return;
        }

        if (fileSize < 50 || fileSize > 200) {
            toast.error('PDF file size must be between 50MB and 200MB');
            return;
        }

        setUploading(true);
        const uploadToast = toast.loading('Uploading PDF to GitHub Releases...');

        try {
            // Create FormData
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                data.append(key, formData[key]);
            });
            data.append('pdf', pdfFile);
            if (coverFile) {
                data.append('cover_image', coverFile);
            }

            // Upload to GitHub Releases API
            const response = await api.post('/github-releases/upload-pdf', data, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                timeout: 300000 // 5 minute timeout for large files
            });

            toast.success('PDF uploaded successfully!', { id: uploadToast });

            // Reset form
            setFormData({
                topic_id: '',
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

            // Show success details
            console.log('Upload response:', response.data);

        } catch (error) {
            console.error('Upload error:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Upload failed';
            toast.error(errorMsg, { id: uploadToast });
        } finally {
            setUploading(false);
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
                    {/* Topic Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Topic / Category <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="topic_id"
                            value={formData.topic_id}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">Select a topic...</option>
                            {topics.map(topic => (
                                <option key={topic.id} value={topic.id}>
                                    {topic.title || topic.name}
                                </option>
                            ))}
                        </select>
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
                            PDF File (50MB - 200MB) <span className="text-red-500">*</span>
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
                            <p className={`mt-2 text-sm ${fileSize >= 50 && fileSize <= 200 ? 'text-green-600' : 'text-red-600'}`}>
                                File size: {fileSize.toFixed(2)} MB
                                {fileSize < 50 && ' (Too small - minimum 50MB)'}
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
                            disabled={uploading || fileSize < 50 || fileSize > 200}
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
                        <li>• Automatic organization by topics/categories</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
