-- Add support for multiple books per topic
-- Each topic can have multiple PDF books (e.g., Social Studies Book 1, Book 2, etc.)

CREATE TABLE IF NOT EXISTS topic_books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    
    -- Book details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    book_number INTEGER DEFAULT 1,
    
    -- PDF file info
    pdf_url VARCHAR(500) NOT NULL,
    pdf_filename VARCHAR(255),
    file_size_bytes BIGINT,
    total_pages INTEGER,
    
    -- Cover image
    cover_image_url VARCHAR(500),
    
    -- Metadata
    author VARCHAR(255),
    publisher VARCHAR(255),
    publication_year INTEGER,
    isbn VARCHAR(20),
    
    -- Display order
    display_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS topic_books_topic_id_idx ON topic_books(topic_id);
CREATE INDEX IF NOT EXISTS topic_books_display_order_idx ON topic_books(display_order);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_topic_books_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS topic_books_updated_at_trigger ON topic_books;
CREATE TRIGGER topic_books_updated_at_trigger
    BEFORE UPDATE ON topic_books
    FOR EACH ROW
    EXECUTE FUNCTION update_topic_books_updated_at();

-- Add comments
COMMENT ON TABLE topic_books IS 'Stores multiple PDF books for each topic (e.g., Social Studies Book 1, Book 2, Book 3)';
COMMENT ON COLUMN topic_books.book_number IS 'Book number in the series (1, 2, 3, etc.)';
COMMENT ON COLUMN topic_books.display_order IS 'Order in which books should be displayed';
