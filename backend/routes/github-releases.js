/**
 * GitHub Releases PDF Upload Routes
 * Upload PDFs to GitHub Releases for permanent storage
 */

const express = require('express');
const router = express.Router();
const { Octokit } = require('@octokit/rest');
const multer = require('multer');
const path = require('path');
const { supabase } = require('../lib/supabase');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GitHub configuration
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'Raman-0123';
const GITHUB_REPO = process.env.GITHUB_REPO || 'GyanDhara';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Initialize Octokit
const octokit = new Octokit({
    auth: GITHUB_TOKEN
});

// Configure multer for large PDF uploads (up to 2GB)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 2 * 1024 * 1024 * 1024 // 2GB limit for GitHub releases
    },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'pdf') {
            const allowedTypes = /pdf/;
            const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
            const mimetype = allowedTypes.test(file.mimetype);
            if (mimetype && extname) {
                return cb(null, true);
            }
            cb(new Error('Only PDF files are allowed'));
        } else if (file.fieldname === 'cover_image') {
            const allowedTypes = /jpeg|jpg|png|webp/;
            const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
            const mimetype = allowedTypes.test(file.mimetype);
            if (mimetype && extname) {
                return cb(null, true);
            }
            cb(new Error('Only images (JPEG, PNG, WebP) are allowed for cover'));
        }
        cb(null, true);
    }
});

/**
 * Create or get the latest release for PDF storage
 */
async function getOrCreateRelease(tagName = 'pdf-storage-v1') {
    try {
        // Try to get existing release
        const { data: release } = await octokit.repos.getReleaseByTag({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            tag: tagName
        });
        return release;
    } catch (error) {
        if (error.status === 404) {
            // Create new release if it doesn't exist
            const { data: newRelease } = await octokit.repos.createRelease({
                owner: GITHUB_OWNER,
                repo: GITHUB_REPO,
                tag_name: tagName,
                name: 'PDF Storage',
                body: 'Storage for educational PDFs uploaded via GyanDhara admin panel',
                draft: false,
                prerelease: false
            });
            return newRelease;
        }
        throw error;
    }
}

/**
 * Upload PDF file to GitHub Release
 */
async function uploadPDFToRelease(file, release, customName = null) {
    if (!file) return null;

    // Generate safe filename
    const sanitizedName = customName || file.originalname.replace(/\s+/g, '_');
    const timestamp = Date.now();
    const filename = `${timestamp}-${sanitizedName}`;

    try {
        // Upload asset to release
        const { data: asset } = await octokit.repos.uploadReleaseAsset({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            release_id: release.id,
            name: filename,
            data: file.buffer,
            headers: {
                'content-type': file.mimetype,
                'content-length': file.size
            }
        });

        return {
            download_url: asset.browser_download_url,
            asset_id: asset.id,
            filename: asset.name,
            size: asset.size,
            originalname: file.originalname
        };
    } catch (error) {
        console.error('Error uploading to GitHub Release:', error);
        throw new Error(`Failed to upload PDF to GitHub Releases: ${error.message}`);
    }
}

/**
 * Upload cover image to Supabase Storage (smaller files)
 */
async function uploadCoverImage(file) {
    if (!file) return null;

    const sanitizedName = file.originalname.replace(/\s+/g, '_');
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${sanitizedName}`;
    const filePath = `covers/${filename}`;

    const { error: uploadError } = await supabase.storage
        .from('books')
        .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: true
        });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('books').getPublicUrl(filePath);
    return data.publicUrl;
}

/**
 * POST /api/github-releases/upload-pdf
 * Upload PDF to GitHub Releases and store metadata in Supabase
 * Requires admin authentication
 */
router.post('/upload-pdf',
    authenticateToken,
    requireAdmin,
    upload.fields([
        { name: 'pdf', maxCount: 1 },
        { name: 'cover_image', maxCount: 1 }
    ]),
    asyncHandler(async (req, res) => {
        const {
            topic_id,
            title,
            description,
            book_number,
            author,
            publisher,
            publication_year,
            isbn,
            display_order
        } = req.body;

        // Validate required fields
        if (!topic_id || !title || !req.files?.pdf) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: topic_id, title, and pdf file are required'
            });
        }

        const pdfFile = req.files.pdf[0];
        const coverFile = req.files.cover_image?.[0];

        // Validate file size (50MB minimum, 200MB maximum as per requirements)
        const fileSizeMB = pdfFile.size / (1024 * 1024);
        if (fileSizeMB < 50) {
            return res.status(400).json({
                success: false,
                error: `PDF file size (${fileSizeMB.toFixed(2)}MB) is less than 50MB minimum requirement`
            });
        }
        if (fileSizeMB > 200) {
            return res.status(400).json({
                success: false,
                error: `PDF file size (${fileSizeMB.toFixed(2)}MB) exceeds 200MB maximum limit`
            });
        }

        try {
            // Step 1: Get or create GitHub release
            const release = await getOrCreateRelease();
            console.log(`Using GitHub Release: ${release.tag_name}`);

            // Step 2: Upload PDF to GitHub Release
            const pdfData = await uploadPDFToRelease(pdfFile, release, title);
            console.log(`PDF uploaded to GitHub: ${pdfData.download_url}`);

            // Step 3: Upload cover image to Supabase (if provided)
            let coverImageUrl = null;
            if (coverFile) {
                coverImageUrl = await uploadCoverImage(coverFile);
                console.log(`Cover image uploaded: ${coverImageUrl}`);
            }

            // Step 4: Store metadata in Supabase database
            const { data: book, error: dbError } = await supabase
                .from('topic_books')
                .insert({
                    topic_id,
                    title,
                    description: description || null,
                    book_number: parseInt(book_number) || 1,
                    pdf_url: pdfData.download_url,
                    pdf_filename: pdfData.originalname,
                    file_size_bytes: pdfData.size,
                    cover_image_url: coverImageUrl,
                    author: author || null,
                    publisher: publisher || null,
                    publication_year: publication_year ? parseInt(publication_year) : null,
                    isbn: isbn || null,
                    display_order: parseInt(display_order) || 1,
                    is_active: true,
                    storage_type: 'github_release', // Track storage method
                    github_asset_id: pdfData.asset_id,
                    github_release_tag: release.tag_name
                })
                .select()
                .single();

            if (dbError) throw dbError;

            res.json({
                success: true,
                message: 'PDF uploaded successfully to GitHub Releases',
                book: {
                    ...book,
                    file_size_mb: (book.file_size_bytes / (1024 * 1024)).toFixed(2)
                },
                storage: {
                    type: 'github_release',
                    release_tag: release.tag_name,
                    download_url: pdfData.download_url
                }
            });

        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({
                success: false,
                error: `Upload failed: ${error.message}`
            });
        }
    })
);

/**
 * GET /api/github-releases/pdfs
 * Get all PDFs from the database (with GitHub Release URLs)
 * Public endpoint
 */
router.get('/pdfs', asyncHandler(async (req, res) => {
    const { topic_id } = req.query;

    let query = supabase
        .from('topic_books')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

    if (topic_id) {
        query = query.eq('topic_id', topic_id);
    }

    const { data: books, error } = await query;

    if (error) throw error;

    res.json({
        success: true,
        count: books.length,
        books: books.map(book => ({
            ...book,
            file_size_mb: (book.file_size_bytes / (1024 * 1024)).toFixed(2),
            is_github_release: book.storage_type === 'github_release'
        }))
    });
}));

/**
 * DELETE /api/github-releases/pdf/:id
 * Delete PDF from GitHub Release and database
 * Requires admin authentication
 */
router.delete('/pdf/:id',
    authenticateToken,
    requireAdmin,
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        // Get book metadata
        const { data: book, error: fetchError } = await supabase
            .from('topic_books')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !book) {
            return res.status(404).json({
                success: false,
                error: 'Book not found'
            });
        }

        // Delete from GitHub Release if applicable
        if (book.storage_type === 'github_release' && book.github_asset_id) {
            try {
                await octokit.repos.deleteReleaseAsset({
                    owner: GITHUB_OWNER,
                    repo: GITHUB_REPO,
                    asset_id: book.github_asset_id
                });
                console.log(`Deleted GitHub asset: ${book.github_asset_id}`);
            } catch (error) {
                console.error('Error deleting from GitHub:', error.message);
                // Continue even if GitHub deletion fails
            }
        }

        // Delete from database
        const { error: deleteError } = await supabase
            .from('topic_books')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        res.json({
            success: true,
            message: 'PDF deleted successfully from GitHub Releases and database'
        });
    })
);

/**
 * GET /api/github-releases/stats
 * Get upload statistics
 * Public endpoint
 */
router.get('/stats', asyncHandler(async (req, res) => {
    const { data: books, error } = await supabase
        .from('topic_books')
        .select('file_size_bytes, storage_type');

    if (error) throw error;

    const stats = {
        total_pdfs: books.length,
        github_releases: books.filter(b => b.storage_type === 'github_release').length,
        supabase_storage: books.filter(b => b.storage_type !== 'github_release').length,
        total_size_bytes: books.reduce((sum, b) => sum + (b.file_size_bytes || 0), 0),
        total_size_gb: 0
    };

    stats.total_size_gb = (stats.total_size_bytes / (1024 * 1024 * 1024)).toFixed(2);

    res.json({
        success: true,
        stats
    });
}));

module.exports = router;
