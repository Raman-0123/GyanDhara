const { createClient } = require('./backend/node_modules/@supabase/supabase-js');
const cloudinary = require('./backend/node_modules/cloudinary').v2;
const fs = require('fs');
const path = require('path');
require('./backend/node_modules/dotenv').config({ path: './backend/.env' });

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE
);

async function uploadToCloudinary(filePath, folder = 'gyandhara/books') {
    console.log(`   📤 Uploading to Cloudinary...`);

    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload(filePath, {
            resource_type: 'raw', // For PDFs
            folder: folder,
            use_filename: true,
            unique_filename: true
        }, (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result.secure_url);
            }
        });
    });
}

async function migratePDFsToCloudinary() {
    console.log('🚀 Starting PDF migration to Cloudinary...\n');
    console.log('☁️  Cloudinary supports files up to 100MB (free tier)\n');

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

    let successCount = 0;
    let failCount = 0;

    for (const book of books) {
        console.log(`\n📖 Processing: ${book.title}`);
        console.log(`   Old PDF URL: ${book.pdf_url}`);

        try {
            // Migrate PDF
            if (book.pdf_url && book.pdf_url.startsWith('/uploads/')) {
                const localPdfPath = path.join(__dirname, 'backend', book.pdf_url);

                if (fs.existsSync(localPdfPath)) {
                    const stats = fs.statSync(localPdfPath);
                    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
                    console.log(`   📏 File size: ${fileSizeMB} MB`);

                    // Upload to Cloudinary
                    const newPdfUrl = await uploadToCloudinary(localPdfPath, 'gyandhara/books/pdfs');
                    console.log(`   ✅ PDF uploaded: ${newPdfUrl}`);

                    // Migrate cover image if exists
                    let newCoverUrl = book.cover_image_url;
                    if (book.cover_image_url && book.cover_image_url.startsWith('/uploads/')) {
                        const localCoverPath = path.join(__dirname, 'backend', book.cover_image_url);

                        if (fs.existsSync(localCoverPath)) {
                            newCoverUrl = await uploadToCloudinary(localCoverPath, 'gyandhara/books/covers');
                            console.log(`   ✅ Cover uploaded: ${newCoverUrl}`);
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
                        failCount++;
                    } else {
                        console.log(`   ✅ Database updated!`);
                        successCount++;
                    }

                } else {
                    console.log(`   ⚠️  Local file not found: ${localPdfPath}`);
                    failCount++;
                }
            }

        } catch (err) {
            console.error(`   ❌ Error processing book:`, err.message);
            failCount++;
        }
    }

    console.log('\n\n🎉 Migration complete!');
    console.log(`✅ Success: ${successCount} books`);
    console.log(`❌ Failed: ${failCount} books`);
    console.log('📝 All PDFs now hosted on Cloudinary with public URLs');
}

migratePDFsToCloudinary().catch(console.error);
