const { createClient } = require('./backend/node_modules/@supabase/supabase-js');
require('./backend/node_modules/dotenv').config({ path: './backend/.env' });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE
);

// COVER IMAGE FILE IDS from Google Drive
// For images, use the DIRECT download link format: https://drive.google.com/uc?export=view&id=FILE_ID

const coverFileIds = [
    'PASTE_COVER_ID_1',  // Education and Academical
    'PASTE_COVER_ID_2',  // Education and Academical 2
    'PASTE_COVER_ID_3',  // Ideas book 1
    'PASTE_COVER_ID_4',  // Ideas book 2
    'PASTE_COVER_ID_5',  // Ideas book 3
    'PASTE_COVER_ID_6',  // ideas book 4
    'PASTE_COVER_ID_7',  // Ideas book 5
    'PASTE_COVER_ID_8',  // Ideas book 6
    'PASTE_COVER_ID_9',  // Ideas book 7
    'PASTE_COVER_ID_10', // Ideas book 8
    'PASTE_COVER_ID_11', // Ideas book 9
    'PASTE_COVER_ID_12', // Moral Values 1
    'PASTE_COVER_ID_13', // Moral Values 2
    'PASTE_COVER_ID_14', // Study Related 1
    'PASTE_COVER_ID_15', // Study Related 2
    'PASTE_COVER_ID_16', // Study Related 3
    'PASTE_COVER_ID_17', // Study Related 4
    'PASTE_COVER_ID_18', // Study Related 5
    'PASTE_COVER_ID_19', // Study Related 6
    'PASTE_COVER_ID_20', // Study Related 7
    'PASTE_COVER_ID_21', // Study Related 8
];

async function updateCoverImages() {
    console.log('🖼️  Updating books with cover image URLs...\n');

    const { data: books, error } = await supabase
        .from('topic_books')
        .select('*')
        .order('created_at');

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log(`📚 Found ${books.length} books\n`);

    for (let i = 0; i < books.length; i++) {
        const book = books[i];
        const fileId = coverFileIds[i];

        if (!fileId || fileId.startsWith('PASTE_COVER_ID')) {
            console.log(`⚠️  Skipping ${book.title} - no cover ID provided`);
            continue;
        }

        // Use direct image URL format for Google Drive
        const coverUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

        const { error: updateError } = await supabase
            .from('topic_books')
            .update({ cover_image_url: coverUrl })
            .eq('id', book.id);

        if (updateError) {
            console.error(`❌ Failed to update ${book.title}:`, updateError.message);
        } else {
            console.log(`✅ ${book.title} → Cover updated`);
        }
    }

    console.log('\n🎉 Done! All cover images updated');
    console.log('🚀 Deploy again: npx vercel --prod');
}

updateCoverImages().catch(console.error);
