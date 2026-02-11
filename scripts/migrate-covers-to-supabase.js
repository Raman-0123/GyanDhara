// Upload legacy cover images from backend/uploads/books to Supabase Storage
// and update topic_books.cover_image_url to the new public URL.

const path = require('path');
const fs = require('fs');
const { createClient } = require('../backend/node_modules/@supabase/supabase-js');
require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const BUCKET = 'books';
const LEGACY_DIR = path.join(__dirname, '../backend/uploads/books');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

const mimeFor = (filename) => {
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.png') return 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.webp') return 'image/webp';
    return 'application/octet-stream';
};

async function main() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
        throw new Error('Missing Supabase env vars');
    }

    const { data: books, error } = await supabase
        .from('topic_books')
        .select('id,title,cover_image_url')
        .or('cover_image_url.is.null,cover_image_url.ilike.%/uploads/books/%');

    if (error) throw error;
    console.log(`Found ${books.length} books with missing/legacy covers`);

    let uploaded = 0, skipped = 0, missing = 0;

    for (const book of books) {
        const match = (book.cover_image_url || '').match(/\/uploads\/books\/(.+)$/);
        if (!match) {
            skipped += 1;
            continue;
        }
        const filename = match[1];
        const filePath = path.join(LEGACY_DIR, filename);
        if (!fs.existsSync(filePath)) {
            missing += 1;
            console.warn(`⚠️  Missing file for ${book.title}: ${filename}`);
            continue;
        }

        const buffer = await fs.promises.readFile(filePath);
        const storagePath = `books/covers/${filename}`;
        const contentType = mimeFor(filename);

        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, buffer, { upsert: true, contentType });
        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
        const { error: updateError } = await supabase
            .from('topic_books')
            .update({ cover_image_url: publicData.publicUrl })
            .eq('id', book.id);
        if (updateError) throw updateError;

        uploaded += 1;
        console.log(`✅ ${book.title} → ${publicData.publicUrl}`);
    }

    console.log(`\nDone. Uploaded ${uploaded}, skipped ${skipped}, missing files ${missing}.`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
