// Script to initialize Supabase database with schema
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function initializeDatabase() {
    console.log('🔄 Initializing database...');

    try {
        // Read the schema file
        const schemaPath = path.join(__dirname, 'database', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('📄 Schema file loaded');
        console.log('⚠️  Note: You need to run this SQL in Supabase SQL Editor manually');
        console.log('🔗 Go to: https://supabase.com/dashboard/project/xxxcqiehjhcgmzdlwkkz/sql');
        console.log('\n📋 Copy and paste the contents of backend/database/schema.sql\n');

        // Check if database is accessible
        const { data, error } = await supabase.from('themes').select('count');

        if (error && error.code === '42P01') {
            console.log('❌ Tables not found. Please run the schema.sql in Supabase SQL Editor first.');
            console.log('\nSteps:');
            console.log('1. Go to Supabase Dashboard');
            console.log('2. Click SQL Editor in sidebar');
            console.log('3. Copy entire content from backend/database/schema.sql');
            console.log('4. Paste and click RUN');
            console.log('5. Run this script again\n');
        } else if (error) {
            console.error('❌ Database error:', error.message);
        } else {
            console.log('✅ Database is initialized!');
            console.log(`📊 Found ${data?.[0]?.count || 0} themes`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Check database connection
async function checkConnection() {
    console.log('🔍 Checking Supabase connection...\n');
    console.log('URL:', process.env.SUPABASE_URL);
    console.log('Key:', process.env.SUPABASE_SERVICE_KEY ? '✓ Set' : '✗ Missing');
    console.log('');

    await initializeDatabase();
}

checkConnection();
