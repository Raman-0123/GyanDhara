-- Update all books with Google Drive URLs
-- Replace FILE_ID with actual Google Drive file IDs

-- Example format:
-- UPDATE topic_books SET pdf_url = 'https://drive.google.com/file/d/YOUR_FILE_ID/preview' WHERE title = 'Book Name';

-- Template for all books:
UPDATE topic_books SET pdf_url = 'https://drive.google.com/file/d/FILE_ID_1/preview' WHERE id = '5ac10442-782a-4112-8116-22ccce8f0c57';
UPDATE topic_books SET pdf_url = 'https://drive.google.com/file/d/FILE_ID_2/preview' WHERE id = '6b262923-3753-453a-bd91-fa1896e74e5f';
UPDATE topic_books SET pdf_url = 'https://drive.google.com/file/d/FILE_ID_3/preview' WHERE id = '991a100a-f8a1-45d6-a9b0-523e9c633096';
UPDATE topic_books SET pdf_url = 'https://drive.google.com/file/d/FILE_ID_4/preview' WHERE id = 'ecc779c4-ca1a-4e63-a13d-4e3a42f1fe0c';
UPDATE topic_books SET pdf_url = 'https://drive.google.com/file/d/FILE_ID_5/preview' WHERE id = '2824916c-ce48-4f75-bade-332ff49077c4';
UPDATE topic_books SET pdf_url = 'https://drive.google.com/file/d/FILE_ID_6/preview' WHERE id = 'bf28b303-9320-452c-b75c-4e29f9faa670';
UPDATE topic_books SET pdf_url = 'https://drive.google.com/file/d/FILE_ID_7/preview' WHERE id = 'a1cf76a1-f49c-45e1-af32-7997f89a7d4a';
UPDATE topic_books SET pdf_url = 'https://drive.google.com/file/d/FILE_ID_8/preview' WHERE id = '82caead7-9fa9-4e13-8cb9-468eeabe86df';
UPDATE topic_books SET pdf_url = 'https://drive.google.com/file/d/FILE_ID_9/preview' WHERE id = 'da3beef1-877c-4356-832c-9aade1fa9eee';
UPDATE topic_books SET pdf_url = 'https://drive.google.com/file/d/FILE_ID_10/preview' WHERE id = 'af570f09-c899-4f95-b52e-4d9e40d3c7c7';
UPDATE topic_books SET pdf_url = 'https://drive.google.com/file/d/FILE_ID_11/preview' WHERE id = '77b1ca83-90c7-4005-aaf8-e157e920abe1';
UPDATE topic_books SET pdf_url = 'https://drive.google.com/file/d/FILE_ID_12/preview' WHERE id = '3871e4ba-ff8b-40e9-9a04-b9c8b13db073';
UPDATE topic_books SET pdf_url = 'https://drive.google.com/file/d/FILE_ID_13/preview' WHERE id = 'f3739589-fabd-4d09-852e-0b93aac69884';
UPDATE topic_books SET pdf_url = 'https://drive.google.com/file/d/FILE_ID_14/preview' WHERE id = '21f978de-a67b-45d0-8154-3c9224f13bd2';

-- After uploading to Google Drive and getting all file IDs:
-- 1. Replace FILE_ID_1, FILE_ID_2, etc. with actual Google Drive file IDs
-- 2. Run this in Supabase SQL Editor
-- 3. Verify: SELECT title, pdf_url FROM topic_books;
