const { createClient } = require('../backend/node_modules/@supabase/supabase-js');
const path = require('path');
require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

// Seed topics per theme
const TOPICS = [
  { theme_id: '7e4d4afd-738e-4745-8eed-97bb7bee9210', title: 'History PDFs', summary: 'PDF books for History', difficulty_level: 'easy' },
  { theme_id: '7e4d4afd-738e-4745-8eed-97bb7bee9210', title: 'Social Studies PDF', summary: 'Social Studies learning material', difficulty_level: 'medium' },
  { theme_id: '03569858-a4d5-42a6-a564-61b1376854be', title: 'Moral Values PDFs', summary: 'Moral values reading material', difficulty_level: 'easy' },
  { theme_id: 'd7f6fd7a-afe4-45ae-81e5-e3179b854e3a', title: 'Agriculture PDFs', summary: 'Agriculture related PDFs', difficulty_level: 'easy' },
  { theme_id: '595f3415-54e6-4dde-aa63-4615bae5bde9', title: 'Education PDFs', summary: 'Education and academical PDFs', difficulty_level: 'medium' },
  { theme_id: '595f3415-54e6-4dde-aa63-4615bae5bde9', title: 'Study Related PDFs', summary: 'Study related books and notes', difficulty_level: 'medium' },
  { theme_id: '89e26947-dcce-4ab5-b6fc-144d1251e34a', title: 'Ideas PDFs', summary: 'Ideas and thoughts collections', difficulty_level: 'easy' },
  { theme_id: 'd67ac753-e10e-4e33-bddc-113aa54c16ac', title: 'Poems PDFs', summary: 'Poetry, verses, literary expressions', difficulty_level: 'easy' }
];

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    throw new Error('Missing Supabase env vars');
  }

  // Wipe existing topics to avoid duplicates (safe because this is a restore script)
  await supabase.from('topics').delete().neq('id', null);

  // Fetch theme names for lookup
  const { data: themes, error: themeErr } = await supabase.from('themes').select('id,name');
  if (themeErr) throw themeErr;
  const nameById = Object.fromEntries((themes || []).map(t => [t.id, t.name]));

  // Insert topics
  const rows = TOPICS.map(t => ({
    ...t,
    theme_name: nameById[t.theme_id] || null,
    detected_language: 'en',
    is_verified: true,
    view_count: 0,
    bookmark_count: 0
  }));

  const { data: inserted, error: insertErr } = await supabase.from('topics').insert(rows).select('id,title,theme_id');
  if (insertErr) throw insertErr;
  console.log('Inserted topics:', inserted.length);

  // Recalculate theme topic counts
  const { data: topicRows, error: countErr } = await supabase
    .from('topics')
    .select('theme_id');
  if (countErr) throw countErr;

  const countsMap = {};
  (topicRows || []).forEach(r => {
    countsMap[r.theme_id] = (countsMap[r.theme_id] || 0) + 1;
  });
  const updates = Object.entries(countsMap).map(([id, count]) => ({ id, topic_count: count }));
  for (const u of updates) {
    const { error } = await supabase.from('themes').update({ topic_count: u.topic_count }).eq('id', u.id);
    if (error) throw error;
  }
  // Set zero for themes without topics
  const themeIdsWithTopics = new Set(updates.map(u => u.id));
  for (const theme of themes || []) {
    if (!themeIdsWithTopics.has(theme.id)) {
      const { error } = await supabase.from('themes').update({ topic_count: 0 }).eq('id', theme.id);
      if (error) throw error;
    }
  }

  console.log('Topic counts updated.');
}

main().catch(err => {
  console.error('Restore failed:', err.message, err); 
  process.exit(1);
});
