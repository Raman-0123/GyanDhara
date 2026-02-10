const { createClient } = require('./backend/node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('./backend/node_modules/dotenv').config({ path: './backend/.env' });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE
);

async function migratePDFsToStorage() {
    console.log('🚀 Starting PDF migration to Supabase Storage...\n');

    // Get all books
    const { data: books, error } = await supabase
        .from('topic_books')
        .select('*')
        .order('created_at');

    if (error) {
        console.error('❌ Error fetching books:', error);
        return;
    }

    console.log(`📚 Found ${books.length} books to migrate\n`);

    for (const book of books) {
        console.log(`\n📖 Processing: ${book.title}`);
        console.log(`   Old PDF URL: ${book.pdf_url}`);

        try {
            // Migrate PDF
            if (book.pdf_url && book.pdf_url.startsWith('/uploads/')) {
                const localPdfPath = path.join(__dirname, 'backend', book.pdf_url);

                if (fs.existsSync(localPdfPath)) {
                    const pdfBuffer = fs.readFileSync(localPdfPath);
                    const pdfFilename = `books/pdfs/${Date.now()}-${book.pdf_filename || path.basename(book.pdf_url)}`;

                    // Upload to Supabase Storage
                    const { error: uploadError } = await supabase.storage
                        .from('books')
                        .upload(pdfFilename, pdfBuffer, {
                            contentType: 'application/pdf',
                            upsert: true
                        });

                    if (uploadError) {
                        console.error(`   ❌ PDF upload failed:`, uploadError.message);
                        continue;
                    }

                    // Get public URL
                    const { data: urlData } = supabase.storage
                        .from('books')
                        .getPublicUrl(pdfFilename);

                    const newPdfUrl = urlData.publicUrl;
                    console.log(`   ✅ PDF uploaded: ${newPdfUrl}`);

                    // Migrate cover image if exists
                    let newCoverUrl = book.cover_image_url;
                    if (book.cover_image_url && book.cover_image_url.startsWith('/uploads/')) {
                        const localCoverPath = path.join(__dirname, 'backend', book.cover_image_url);

                        if (fs.existsSync(localCoverPath)) {
                            const coverBuffer = fs.readFileSync(localCoverPath);
                            const coverExt = path.extname(book.cover_image_url);
                            const coverFilename = `books/covers/${Date.now()}-cover${coverExt}`;

                            const { error: coverUploadError } = await supabase.storage
                                .from('books')
                                .upload(coverFilename, coverBuffer, {
                                    contentType: `image/${coverExt.substring(1)}`,
                                    upsert: true
                                });

                            if (!coverUploadError) {
                                const { data: coverUrlData } = supabase.storage
                                    .from('books')
                                    .getPublicUrl(coverFilename);

                                newCoverUrl = coverUrlData.publicUrl;
                                console.log(`   ✅ Cover uploaded: ${newCoverUrl}`);
                            } else {
                                console.log(`   ⚠️  Cover upload failed: ${coverUploadError.message}`);
                            }
                        }
                    }

                    // Update database
                    const { error: updateError } = await supabase
                        .from('topic_books')
                        .update({
                            pdf_url: newPdfUrl,
                            cover_image_url: newCoverUrl
                        })
                        .eq('id', book.id);

                    if (updateError) {
                        console.error(`   ❌ Database update failed:`, updateError.message);
                    } else {
                        console.log(`   ✅ Database updated!`);
                    }

                } else {
                    console.log(`   ⚠️  Local file not found: ${localPdfPath}`);
                }
            }

        } catch (err) {
            console.error(`   ❌ Error processing book:`, err.message);
        }
    }

    console.log('\n\n🎉 Migration complete!');
    console.log('📝 Summary: All PDFs and covers uploaded to Supabase Storage');
    console.log('🔗 Database records updated with public URLs');
}

migratePDFsToStorage().catch(console.error);
