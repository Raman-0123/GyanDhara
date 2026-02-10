const { createClient } = require('./backend/node_modules/@supabase/supabase-js');
require('./backend/node_modules/dotenv').config({ path: './backend/.env' });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE
);

// YOUR GOOGLE DRIVE FILE IDS - Get these by:
// 1. Open: https://drive.google.com/drive/folders/1Z0Vvkjr7Pb1T3EIKxBjyHy60PkF9EZ_2
// 2. For EACH PDF, right-click → Open in new tab
// 3. Copy the FILE_ID from URL: https://drive.google.com/file/d/FILE_ID_HERE/view
// 4. Paste them below in the SAME ORDER as your books appear in database

const driveFileIds = [
    '1XvrSMEDBT2dApn2_FEvHtrD34anLJ8TN',
    '1m2H4_C77D7ZWOCW_gLEl6QrRfMejCKF3',
    '1xpVhr5rVkpK3crtQ1ubub_JyDFS3tc13',
    '1SsLbFVDZLLDuMuJ2hTXrzfqFgFWcXRNa',
    '1IpMCfFQWizT_fMIv85G5An3dayyHtWEo',
    'PASTE_FILE_ID_6_HERE',
    'PASTE_FILE_ID_7_HERE',
    'PASTE_FILE_ID_8_HERE',
    'PASTE_FILE_ID_9_HERE',
    'PASTE_FILE_ID_10_HERE',
    'PASTE_FILE_ID_11_HERE',
    'PASTE_FILE_ID_12_HERE',
    'PASTE_FILE_ID_13_HERE',
    'PASTE_FILE_ID_14_HERE',
    'PASTE_FILE_ID_15_HERE',
    'PASTE_FILE_ID_16_HERE',
    'PASTE_FILE_ID_17_HERE',
    'PASTE_FILE_ID_18_HERE',
    'PASTE_FILE_ID_19_HERE',
    'PASTE_FILE_ID_20_HERE',
    'PASTE_FILE_ID_21_HERE',
];

async function updateWithGoogleDrive() {
    console.log('🚀 Updating books with Google Drive URLs...\n');

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
        const fileId = driveFileIds[i];

        if (!fileId || fileId.startsWith('PASTE_FILE_ID')) {
            console.log(`⚠️  Skipping ${book.title} - no file ID provided`);
            continue;
        }

        const driveUrl = `https://drive.google.com/file/d/${fileId}/preview`;

        const { error: updateError } = await supabase
            .from('topic_books')
            .update({ pdf_url: driveUrl })
            .eq('id', book.id);

        if (updateError) {
            console.error(`❌ Failed to update ${book.title}:`, updateError.message);
        } else {
            console.log(`✅ ${book.title} → ${driveUrl}`);
        }
    }

    console.log('\n🎉 Done! All books updated with Google Drive URLs');
    console.log('🚀 Now deploy: npx vercel --prod');
}

updateWithGoogleDrive().catch(console.error);
