-- Delete all existing books with localhost URLs
DELETE FROM topic_books WHERE pdf_url LIKE '%localhost%';

-- Or delete all books to start fresh
-- DELETE FROM topic_books;

-- Verify
SELECT id, title, pdf_url FROM topic_books;
