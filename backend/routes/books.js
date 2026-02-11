const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Use memory storage; we'll push files to Supabase Storage (persist across deployments)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB limit for PDF books
    },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'pdf') {
            const allowedTypes = /pdf/;
            const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
            const mimetype = allowedTypes.test(file.mimetype);
            if (mimetype && extname) {
                return cb(null, true);
            }
            cb(new Error('Only PDF files are allowed for books'));
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

async function uploadToStorage(file, folder = 'books') {
    if (!file) return { publicUrl: null, size: 0, originalname: null };
    const sanitizedName = file.originalname.replace(/\s+/g, '_');
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${sanitizedName}`;
    const filePath = `${folder}/${filename}`;

    const { error: uploadError } = await supabase.storage
        .from('books')
        .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: true
        });

    if (uploadError) {
        throw uploadError;
    }

    const { data } = supabase.storage.from('books').getPublicUrl(filePath);
    return { publicUrl: data.publicUrl, size: file.size, originalname: file.originalname };
}

/**
 * GET /api/books/topic/:topicId
 * Get all books for a topic
 */
router.get('/topic/:topicId', asyncHandler(async (req, res) => {
    const { topicId } = req.params;

    const { data: books, error } = await supabase
        .from('topic_books')
        .select('*')
        .eq('topic_id', topicId)
        .eq('is_active', true)
        .order('display_order');

    if (error) throw error;

    res.json({
        success: true,
        books,
        count: books.length
    });
}));

/**
 * GET /api/books/:id
 * Get single book by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { data: book, error } = await supabase
        .from('topic_books')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !book) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Book not found'
        });
    }

    res.json({
        success: true,
        book
    });
}));

/**
 * POST /api/books
 * Create a new book for a topic
 */
router.post('/', upload.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'cover_image', maxCount: 1 }
]), asyncHandler(async (req, res) => {
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

    // Validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!topic_id || !uuidRegex.test(topic_id)) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid or missing topic_id'
        });
    }

    if (!title) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'Book title is required'
        });
    }

    // Handle PDF upload (Supabase storage)
    let pdfUrl = null;
    let pdfFilename = null;
    let fileSize = null;

    if (req.files && req.files.pdf && req.files.pdf[0]) {
        const pdfFile = req.files.pdf[0];
        const { publicUrl, size, originalname } = await uploadToStorage(pdfFile, 'books/pdfs');
        pdfUrl = publicUrl;
        pdfFilename = originalname;
        fileSize = size;
    } else {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'PDF file is required'
        });
    }

    // Handle cover image (Supabase storage)
    let coverImageUrl = null;
    if (req.files && req.files.cover_image && req.files.cover_image[0]) {
        const coverFile = req.files.cover_image[0];
        const { publicUrl } = await uploadToStorage(coverFile, 'books/covers');
        coverImageUrl = publicUrl;
    }

    const { data: book, error } = await supabase
        .from('topic_books')
        .insert({
            topic_id,
            title,
            description,
            book_number: book_number ? parseInt(book_number) : 1,
            pdf_url: pdfUrl,
            pdf_filename: pdfFilename,
            file_size_bytes: fileSize,
            cover_image_url: coverImageUrl,
            author,
            publisher,
            publication_year: publication_year ? parseInt(publication_year) : null,
            isbn,
            display_order: display_order ? parseInt(display_order) : 1
        })
        .select()
        .single();

    if (error) throw error;

    res.status(201).json({
        success: true,
        message: 'Book created successfully',
        book
    });
}));

/**
 * PUT /api/books/:id
 * Update a book
 */
router.put('/:id', upload.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'cover_image', maxCount: 1 }
]), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        title,
        description,
        book_number,
        author,
        publisher,
        publication_year,
        isbn,
        display_order
    } = req.body;

    const updateData = {};

    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (book_number) updateData.book_number = parseInt(book_number);
    if (author) updateData.author = author;
    if (publisher) updateData.publisher = publisher;
    if (publication_year) updateData.publication_year = parseInt(publication_year);
    if (isbn) updateData.isbn = isbn;
    if (display_order) updateData.display_order = parseInt(display_order);

    // Handle new PDF upload
    if (req.files && req.files.pdf && req.files.pdf[0]) {
        const pdfFile = req.files.pdf[0];
        const { publicUrl, size, originalname } = await uploadToStorage(pdfFile, 'books/pdfs');
        updateData.pdf_url = publicUrl;
        updateData.pdf_filename = originalname;
        updateData.file_size_bytes = size;
    }

    // Handle new cover image
    if (req.files && req.files.cover_image && req.files.cover_image[0]) {
        const coverFile = req.files.cover_image[0];
        const { publicUrl } = await uploadToStorage(coverFile, 'books/covers');
        updateData.cover_image_url = publicUrl;
    }

    const { data: book, error } = await supabase
        .from('topic_books')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;

    res.json({
        success: true,
        message: 'Book updated successfully',
        book
    });
}));

/**
 * DELETE /api/books/:id
 * Delete a book
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
        .from('topic_books')
        .delete()
        .eq('id', id);

    if (error) throw error;

    res.json({
        success: true,
        message: 'Book deleted successfully'
    });
}));

// Admin-only: migrate legacy cover_image_url entries that point to /uploads/books into Supabase Storage
router.post('/migrate-missing-covers',
    authenticateToken,
    requireAdmin,
    asyncHandler(async (_req, res) => {
        const { data: books, error } = await supabase
            .from('topic_books')
            .select('id, title, cover_image_url')
            .or('cover_image_url.is.null,cover_image_url.ilike./uploads/%');

        if (error) throw error;

        let updated = 0;
        let missingFile = 0;
        let skipped = 0;
        const errors = [];

        for (const book of books) {
            const coverUrl = book.cover_image_url || '';
            const match = coverUrl.match(/\/uploads\/books\/(.+)$/);
            if (!match) {
                skipped += 1;
                continue;
            }

            const filename = match[1];
            const filePath = path.join(__dirname, '../uploads/books', filename);

            if (!fs.existsSync(filePath)) {
                missingFile += 1;
                errors.push({ id: book.id, title: book.title, error: 'file_not_found', filePath });
                continue;
            }

            try {
                const buffer = await fs.promises.readFile(filePath);
                const { error: uploadError } = await supabase.storage
                    .from('books')
                    .upload(`books/covers/${filename}`, buffer, {
                        contentType: 'image/png',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from('books').getPublicUrl(`books/covers/${filename}`);

                const { error: updateError } = await supabase
                    .from('topic_books')
                    .update({ cover_image_url: data.publicUrl })
                    .eq('id', book.id);

                if (updateError) throw updateError;

                updated += 1;
            } catch (err) {
                errors.push({ id: book.id, title: book.title, error: err.message });
            }
        }

        res.json({
            success: true,
            updated,
            missingFile,
            skipped,
            errors
        });
    })
);

module.exports = router;
