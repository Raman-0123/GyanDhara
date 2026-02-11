/**
 * GitHub Releases PDF Upload Routes
 * Upload PDFs to GitHub Releases for permanent storage
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { supabase, supabaseConfig, requireSupabase } = require('../lib/supabase');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// GitHub configuration
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'Raman-0123';
const GITHUB_REPO = process.env.GITHUB_REPO || 'GyanDhara';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
let octokitInstance = null;
async function getOctokit() {
    if (octokitInstance) return octokitInstance;
    const { Octokit } = await import('@octokit/rest');
    octokitInstance = new Octokit({ auth: GITHUB_TOKEN });
    return octokitInstance;
}

// Configure multer for large PDF uploads (up to 2GB)
const upload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, os.tmpdir()),
        filename: (_req, file, cb) => {
            const safeName = file.originalname.replace(/\s+/g, '_');
            cb(null, `${Date.now()}-${safeName}`);
        }
    }),
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
            return cb(new Error('Only PDF files are allowed'));
        } else if (file.fieldname === 'cover_image') {
            const allowedTypes = /jpeg|jpg|png|webp/;
            const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
            const mimetype = allowedTypes.test(file.mimetype);
            if (mimetype && extname) {
                return cb(null, true);
            }
            return cb(new Error('Only images (JPEG, PNG, WebP) are allowed for cover'));
        }
        return cb(null, true);
    }
});

/**
 * Create or get the latest release for PDF storage
 */
async function getOrCreateRelease(tagName = 'pdf-storage-v1') {
    try {
        const octokit = await getOctokit();
        // Try to get existing release
        const { data: release } = await octokit.repos.getReleaseByTag({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            tag: tagName
        });
        return release;
    } catch (error) {
        if (error.status === 404) {
            const octokit = await getOctokit();
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
        const octokit = await getOctokit();
        // Upload asset to release
        const stream = fs.createReadStream(file.path);
        const { data: asset } = await octokit.repos.uploadReleaseAsset({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            release_id: release.id,
            name: filename,
            data: stream,
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

    const supabase = requireSupabase();
    const fileBuffer = fs.readFileSync(file.path);

    const sanitizedName = file.originalname.replace(/\s+/g, '_');
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${sanitizedName}`;
    const filePath = `covers/${filename}`;

    const { error: uploadError } = await supabase.storage
        .from('books')
        .upload(filePath, fileBuffer, {
            contentType: file.mimetype,
            upsert: true
        });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('books').getPublicUrl(filePath);
    return data.publicUrl;
}

// Download an existing PDF to a temporary file so it can be re-uploaded to GitHub Releases
async function downloadToTempFile(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.isBuffer(response.data) ? response.data : Buffer.from(response.data);

    // Try to preserve the original filename; fall back to the URL path or a generic name
    const disposition = response.headers['content-disposition'] || '';
    const filenameMatch = disposition.match(/filename\*=UTF-8''(.+)$|filename="?([^";]+)"?/i);
    const rawName = filenameMatch?.[1] || filenameMatch?.[2] || path.basename(new URL(url).pathname) || 'document.pdf';
    const sanitizedName = rawName.replace(/\s+/g, '_');

    const tempPath = path.join(os.tmpdir(), `${Date.now()}-${Math.round(Math.random() * 1e9)}-${sanitizedName}`);
    fs.writeFileSync(tempPath, buffer);

    return {
        path: tempPath,
        originalname: sanitizedName,
        mimetype: response.headers['content-type'] || 'application/pdf',
        size: buffer.length
    };
}

/**
 * Books are stored in topic_books, which requires a topic_id.
 * For theme-wise uploads, we create (or reuse) a dedicated topic per theme.
 */
async function getOrCreateThemeBucketTopic(themeId) {
    if (!uuidRegex.test(themeId)) {
        throw new Error('Invalid theme_id');
    }

    const supabase = requireSupabase();
    const { data: theme, error: themeError } = await supabase
        .from('themes')
        .select('id, name')
        .eq('id', themeId)
        .single();

    if (themeError || !theme) {
        throw new Error('Theme not found');
    }

    const bucketTitle = `${theme.name} PDFs`;

    const { data: existing, error: existingError } = await supabase
        .from('topics')
        .select('id')
        .eq('theme_id', themeId)
        .eq('title', bucketTitle)
        .maybeSingle();

    if (existingError) throw existingError;
    if (existing?.id) return existing.id;

    const { data: created, error: createError } = await supabase
        .from('topics')
        .insert({
            theme_id: themeId,
            theme_name: theme.name,
            title: bucketTitle,
            summary: `PDF books for ${theme.name}`,
            difficulty_level: 'easy',
            detected_language: 'en',
            is_verified: true,
            is_pinned: true,
            view_count: 0,
            bookmark_count: 0
        })
        .select('id')
        .single();

    if (createError) throw createError;
    return created.id;
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
        const supabase = requireSupabase();
        const {
            topic_id,
            theme_id,
            title,
            description,
            book_number,
            author,
            publisher,
            publication_year,
            isbn,
            display_order
        } = req.body;

        if (process.env.NODE_ENV !== 'production') {
            console.info('[upload-pdf] request received', {
                contentType: req.headers['content-type'],
                bodyKeys: Object.keys(req.body || {}),
                filesKeys: Object.keys(req.files || {}),
                hasPdf: Boolean(req.files?.pdf?.[0]),
                hasCover: Boolean(req.files?.cover_image?.[0]),
                topic_id: topic_id || null,
                theme_id: theme_id || null,
                title: title || null,
            });
        }

        // Validate required fields
        if ((!topic_id && !theme_id) || !title || !req.files?.pdf?.[0]) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: theme_id (or topic_id), title, and pdf file are required'
            });
        }

        let resolvedTopicId = topic_id;
        if (!resolvedTopicId && theme_id) {
            resolvedTopicId = await getOrCreateThemeBucketTopic(theme_id);
        }

        const pdfFile = req.files.pdf[0];
        const coverFile = req.files.cover_image?.[0];

        // Validate file size (200MB maximum)
        const fileSizeMB = pdfFile.size / (1024 * 1024);
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
                    topic_id: resolvedTopicId,
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
        } finally {
            if (pdfFile?.path) {
                fs.unlink(pdfFile.path, () => { });
            }
            if (coverFile?.path) {
                fs.unlink(coverFile.path, () => { });
            }
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

    try {
        const supabase = requireSupabase();
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
    } catch (error) {
        console.error('[/api/github-releases/pdfs] Supabase error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch books',
            details: error.message,
            code: error.code,
            supabase: supabaseConfig
        });
    }
}));

/**
 * POST /api/github-releases/migrate-all
 * Migrate all non-GitHub PDFs to GitHub Releases
 * Requires admin authentication
 */
router.post('/migrate-all',
    authenticateToken,
    requireAdmin,
    asyncHandler(async (_req, res) => {
        const supabase = requireSupabase();
        const { data: books, error } = await supabase
            .from('topic_books')
            .select('*')
            .or('storage_type.is.null,storage_type.neq.github_release')
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (!books || books.length === 0) {
            return res.json({
                success: true,
                migrated: 0,
                skipped: 0,
                failed: 0,
                errors: []
            });
        }

        const release = await getOrCreateRelease();
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

        let migrated = 0;
        let failed = 0;
        const errors = [];

        for (const book of books) {
            try {
                const sourceUrl = book.pdf_url?.startsWith('http')
                    ? book.pdf_url
                    : `${baseUrl}${book.pdf_url}`;

                if (!sourceUrl) {
                    throw new Error('Missing pdf_url');
                }

                const tempFile = await downloadToTempFile(sourceUrl);
                const pdfData = await uploadPDFToRelease(tempFile, release, book.title || tempFile.originalname);

                await supabase
                    .from('topic_books')
                    .update({
                        pdf_url: pdfData.download_url,
                        pdf_filename: pdfData.originalname,
                        file_size_bytes: pdfData.size,
                        storage_type: 'github_release',
                        github_asset_id: pdfData.asset_id,
                        github_release_tag: release.tag_name
                    })
                    .eq('id', book.id);

                migrated += 1;
                if (tempFile?.path) fs.unlink(tempFile.path, () => { });
            } catch (err) {
                failed += 1;
                errors.push({ id: book.id, title: book.title, error: err.message });
            }
        }

        return res.json({
            success: true,
            migrated,
            skipped: 0,
            failed,
            errors
        });
    })
);

/**
 * PUT /api/github-releases/pdf/:id
 * Update book metadata and optionally replace PDF/cover
 * Requires admin authentication
 */
router.put('/pdf/:id',
    authenticateToken,
    requireAdmin,
    upload.fields([
        { name: 'pdf', maxCount: 1 },
        { name: 'cover_image', maxCount: 1 }
    ]),
    asyncHandler(async (req, res) => {
        const supabase = requireSupabase();
        const { id } = req.params;
        const {
            title,
            description,
            book_number,
            author,
            publisher,
            publication_year,
            isbn,
            display_order,
            is_active
        } = req.body;

        const { data: existing, error: fetchError } = await supabase
            .from('topic_books')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existing) {
            return res.status(404).json({
                success: false,
                error: 'Book not found'
            });
        }

        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description || null;
        if (book_number !== undefined && book_number !== '') updateData.book_number = parseInt(book_number, 10);
        if (author !== undefined) updateData.author = author || null;
        if (publisher !== undefined) updateData.publisher = publisher || null;
        if (publication_year !== undefined && publication_year !== '') {
            updateData.publication_year = parseInt(publication_year, 10);
        }
        if (isbn !== undefined) updateData.isbn = isbn || null;
        if (display_order !== undefined && display_order !== '') updateData.display_order = parseInt(display_order, 10);
        if (is_active !== undefined) {
            updateData.is_active = String(is_active).toLowerCase() === 'true';
        }

        if (req.files?.pdf?.[0]) {
            const pdfFile = req.files.pdf[0];
            const fileSizeMB = pdfFile.size / (1024 * 1024);
            if (fileSizeMB > 200) {
                return res.status(400).json({
                    success: false,
                    error: `PDF file size (${fileSizeMB.toFixed(2)}MB) exceeds 200MB maximum limit`
                });
            }

            const release = await getOrCreateRelease();
            const pdfData = await uploadPDFToRelease(pdfFile, release, title || existing.title);

            if (existing.storage_type === 'github_release' && existing.github_asset_id) {
                try {
                    const octokit = await getOctokit();
                    await octokit.repos.deleteReleaseAsset({
                        owner: GITHUB_OWNER,
                        repo: GITHUB_REPO,
                        asset_id: existing.github_asset_id
                    });
                } catch (error) {
                    console.error('Failed to delete old GitHub asset:', error.message);
                }
            }

            updateData.pdf_url = pdfData.download_url;
            updateData.pdf_filename = pdfData.originalname;
            updateData.file_size_bytes = pdfData.size;
            updateData.storage_type = 'github_release';
            updateData.github_asset_id = pdfData.asset_id;
            updateData.github_release_tag = release.tag_name;
        }

        if (req.files?.cover_image?.[0]) {
            const coverFile = req.files.cover_image[0];
            const coverImageUrl = await uploadCoverImage(coverFile);
            updateData.cover_image_url = coverImageUrl;
        }

        const { data: book, error: updateError } = await supabase
            .from('topic_books')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;

        res.json({
            success: true,
            message: 'Book updated successfully',
            book
        });
        if (req.files?.pdf?.[0]?.path) {
            fs.unlink(req.files.pdf[0].path, () => { });
        }
        if (req.files?.cover_image?.[0]?.path) {
            fs.unlink(req.files.cover_image[0].path, () => { });
        }
    })
);

/**
 * GET /api/github-releases/asset/:assetId
 * Stream a GitHub Release asset inline for PDF viewing
 */
router.get('/asset/:assetId', asyncHandler(async (req, res) => {
    const { assetId } = req.params;
    const assetIdNum = Number(assetId);

    if (!Number.isInteger(assetIdNum)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid assetId'
        });
    }

    const octokit = await getOctokit();
    const { data: metadata } = await octokit.repos.getReleaseAsset({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        asset_id: assetIdNum
    });

    const { data } = await octokit.request('GET /repos/{owner}/{repo}/releases/assets/{asset_id}', {
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        asset_id: assetIdNum,
        headers: { accept: 'application/octet-stream' },
        responseType: 'arraybuffer'
    });

    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${metadata.name || 'document.pdf'}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
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
        const supabase = requireSupabase();
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
                const octokit = await getOctokit();
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
    try {
        const supabase = requireSupabase();
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
    } catch (error) {
        console.error('[/api/github-releases/stats] Supabase error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch stats',
            details: error.message,
            code: error.code,
            supabase: supabaseConfig
        });
    }
}));

module.exports = router;
