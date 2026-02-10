-- Add topic_lessons table for course-like content structure
-- Each topic can have multiple ordered lessons with text, images, and audio

CREATE TABLE IF NOT EXISTS topic_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL, -- Order of lessons (1, 2, 3...)
  title VARCHAR(500) NOT NULL, -- Lesson title
  content_html TEXT NOT NULL, -- Rich HTML content with embedded images
  content_text TEXT, -- Plain text version for translation
  audio_url TEXT, -- Optional audio file URL
  audio_filename VARCHAR(255), -- Original audio filename
  duration_seconds INTEGER, -- Audio duration
  images JSONB, -- Array of image URLs: [{url: "...", caption: "..."}]
  translations JSONB, -- Cached translations: {en: {title: "...", content: "..."}, hi: {...}}
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(topic_id, position)
);

-- Index for faster lesson retrieval
CREATE INDEX IF NOT EXISTS topic_lessons_topic_id_idx ON topic_lessons(topic_id, position);

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_topic_lessons_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER topic_lessons_updated_at
BEFORE UPDATE ON topic_lessons
FOR EACH ROW
EXECUTE FUNCTION update_topic_lessons_timestamp();
