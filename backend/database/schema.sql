-- GyanDhara Database Schema for Supabase PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  profile_pic TEXT,
  preferred_language VARCHAR(5) DEFAULT 'en',
  preferred_theme VARCHAR(100),
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  reset_password_token VARCHAR(255),
  reset_password_expires TIMESTAMP,
  learning_streak INTEGER DEFAULT 0,
  total_learning_time INTEGER DEFAULT 0, -- in minutes
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- Themes table (18 predefined themes)
CREATE TABLE IF NOT EXISTS themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50), -- emoji or icon name
  color VARCHAR(7), -- hex color code
  topic_count INTEGER DEFAULT 0,
  display_order INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- PDF Documents table
CREATE TABLE IF NOT EXISTS pdf_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  storage_provider VARCHAR(50) DEFAULT 'cloudinary', -- cloudinary, supabase, local
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  pages_count INTEGER,
  file_size_mb DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'review_needed')),
  processing_progress INTEGER DEFAULT 0, -- 0-100
  detected_language VARCHAR(5),
  assigned_theme UUID REFERENCES themes(id),
  processing_notes TEXT,
  errors JSONB, -- array of error messages
  pages_needing_review INTEGER[],
  successfully_processed_pages INTEGER DEFAULT 0,
  failed_pages INTEGER DEFAULT 0,
  topics_extracted INTEGER DEFAULT 0,
  processing_started_at TIMESTAMP,
  processing_completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Topics table
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  theme_id UUID REFERENCES themes(id) ON DELETE SET NULL,
  theme_name VARCHAR(100),
  pdf_id UUID REFERENCES pdf_documents(id) ON DELETE CASCADE,
  page_range_start INTEGER,
  page_range_end INTEGER,
  raw_text TEXT,
  raw_text_clean TEXT,
  summary TEXT,
  author_conclusion TEXT,
  detected_language VARCHAR(5),
  difficulty_level VARCHAR(20) DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  translations JSONB, -- {en: "...", hi: "...", pa: "...", etc.}
  is_review_needed BOOLEAN DEFAULT FALSE,
  review_notes TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP,
  view_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0,
  average_quiz_score DECIMAL(5, 2),
  avg_rating DECIMAL(3, 2) DEFAULT 0.00, -- Average rating (0-5)
  total_ratings INTEGER DEFAULT 0, -- Total number of ratings
  tags TEXT[],
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for full-text search on topics
CREATE INDEX IF NOT EXISTS topics_search_idx ON topics USING GIN (
  to_tsvector('english', title || ' ' || COALESCE(raw_text_clean, ''))
);

-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  questions JSONB NOT NULL, -- array of question objects
  auto_generated BOOLEAN DEFAULT TRUE,
  generated_at TIMESTAMP DEFAULT NOW(),
  generated_by VARCHAR(50) DEFAULT 'gemini', -- 'gemini', 'huggingface', 'manual'
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User Progress table
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  user_answers INTEGER[], -- array of user's answer indices (0-3)
  time_spent INTEGER, -- in seconds
  completed BOOLEAN DEFAULT TRUE,
  completed_at TIMESTAMP DEFAULT NOW(),
  attempt_number INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, quiz_id, attempt_number)
);

-- Translations cache table
CREATE TABLE IF NOT EXISTS translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  language VARCHAR(5) NOT NULL,
  text TEXT NOT NULL,
  generated_at TIMESTAMP DEFAULT NOW(),
  generated_by VARCHAR(50) DEFAULT 'lingva', -- 'lingva', 'manual'
  is_automated BOOLEAN DEFAULT TRUE,
  cached BOOLEAN DEFAULT TRUE,
  cache_updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(topic_id, language)
);

-- Bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, topic_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_topics_theme ON topics(theme_id);
CREATE INDEX IF NOT EXISTS idx_topics_difficulty ON topics(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_progress_user ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_topic ON user_progress(topic_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_status ON pdf_documents(status);

-- Insert default themes (18 educational domains)
INSERT INTO themes (name, description, icon, color, display_order) VALUES
  ('History', 'Historical events, figures, and civilizations', '📜', '#8B4513', 1),
  ('Economics', 'Economic theories, markets, and finance', '💰', '#2E7D32', 2),
  ('Political Science', 'Government, politics, and international relations', '🏛️', '#1565C0', 3),
  ('Geography', 'Physical and human geography, maps, regions', '🌍', '#00796B', 4),
  ('Science', 'Physics, Chemistry, Biology, and general science', '🔬', '#7B1FA2', 5),
  ('Moral Values', 'Ethics, character building, and values', '💎', '#C62828', 6),
  ('Agriculture', 'Farming, crops, agricultural practices', '🌾', '#558B2F', 7),
  ('Employment', 'Jobs, career guidance, employment news', '💼', '#F57C00', 8),
  ('Education', 'Learning methods, education system, pedagogy', '📚', '#0277BD', 9),
  ('Sports', 'Games, athletics, sports achievements', '⚽', '#D32F2F', 10),
  ('General Knowledge', 'Facts, trivia, current affairs', '🧠', '#5E35B1', 11),
  ('Poems', 'Poetry, verses, literary expressions', '✍️', '#E91E63', 12),
  ('Stories', 'Short stories, narratives, tales', '📖', '#FF6F00', 13),
  ('Motivation', 'Inspirational content, success stories', '🔥', '#F4511E', 14),
  ('Spiritual', 'Spirituality, philosophy, inner growth', '🕉️', '#6A1B9A', 15),
  ('Thoughts', 'Reflections, ideas, philosophical thoughts', '💭', '#00897B', 16),
  ('Student-Related', 'Study tips, exam preparation, student life', '🎓', '#1976D2', 17),
  ('Human Values', 'Compassion, kindness, humanity', '❤️', '#AD1457', 18)
ON CONFLICT (name) DO NOTHING;

-- Function to update topic count in themes
CREATE OR REPLACE FUNCTION update_theme_topic_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE themes SET topic_count = topic_count + 1 WHERE id = NEW.theme_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE themes SET topic_count = topic_count - 1 WHERE id = OLD.theme_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.theme_id != NEW.theme_id THEN
    UPDATE themes SET topic_count = topic_count - 1 WHERE id = OLD.theme_id;
    UPDATE themes SET topic_count = topic_count + 1 WHERE id = NEW.theme_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update theme topic counts
DROP TRIGGER IF EXISTS update_theme_count ON topics;
CREATE TRIGGER update_theme_count
AFTER INSERT OR UPDATE OR DELETE ON topics
FOR EACH ROW EXECUTE FUNCTION update_theme_topic_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at on relevant tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_topics_updated_at ON topics;
CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pdf_documents_updated_at ON pdf_documents;
CREATE TRIGGER update_pdf_documents_updated_at BEFORE UPDATE ON pdf_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS users_read_own ON users;
DROP POLICY IF EXISTS topics_read_all ON topics;
DROP POLICY IF EXISTS progress_read_own ON user_progress;
DROP POLICY IF EXISTS progress_insert_own ON user_progress;
DROP POLICY IF EXISTS bookmarks_all_own ON bookmarks;

-- Policy: Users can read their own data
CREATE POLICY users_read_own ON users FOR SELECT USING (auth.uid() = id);

-- Policy: Anyone can read published topics
CREATE POLICY topics_read_all ON topics FOR SELECT USING (is_verified = TRUE);

-- Policy: Users can read their own progress
CREATE POLICY progress_read_own ON user_progress FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own progress
CREATE POLICY progress_insert_own ON user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can manage their own bookmarks
CREATE POLICY bookmarks_all_own ON bookmarks FOR ALL USING (auth.uid() = user_id);

-- Grant permissions to authenticated users
GRANT SELECT ON themes TO authenticated;
GRANT SELECT ON topics TO authenticated;
GRANT SELECT ON quizzes TO authenticated;
GRANT ALL ON user_progress TO authenticated;
GRANT ALL ON bookmarks TO authenticated;

-- Ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(topic_id, user_id)
);

-- Create indexes for ratings
CREATE INDEX IF NOT EXISTS idx_ratings_topic ON ratings(topic_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(user_id);

-- Trigger to update ratings updated_at
DROP TRIGGER IF EXISTS update_ratings_updated_at ON ratings;
CREATE TRIGGER update_ratings_updated_at BEFORE UPDATE ON ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update topic average rating
CREATE OR REPLACE FUNCTION update_topic_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE topics SET 
      avg_rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM ratings WHERE topic_id = NEW.topic_id),
      total_ratings = (SELECT COUNT(*) FROM ratings WHERE topic_id = NEW.topic_id)
    WHERE id = NEW.topic_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE topics SET 
      avg_rating = COALESCE((SELECT AVG(rating)::DECIMAL(3,2) FROM ratings WHERE topic_id = OLD.topic_id), 0),
      total_ratings = (SELECT COUNT(*) FROM ratings WHERE topic_id = OLD.topic_id)
    WHERE id = OLD.topic_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update topic ratings
DROP TRIGGER IF EXISTS update_topic_rating_trigger ON ratings;
CREATE TRIGGER update_topic_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON ratings
FOR EACH ROW EXECUTE FUNCTION update_topic_rating();

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts with authentication and profile data';
COMMENT ON TABLE themes IS '18 predefined educational theme categories';
COMMENT ON TABLE topics IS 'Extracted newspaper topics with text and metadata';
COMMENT ON TABLE quizzes IS 'AI-generated quiz questions for each topic';
COMMENT ON TABLE user_progress IS 'User quiz attempts and scores';
COMMENT ON TABLE translations IS 'Cached translations for topics in 12 languages';
COMMENT ON TABLE bookmarks IS 'User-saved topics for quick access';
COMMENT ON TABLE ratings IS 'User ratings and reviews for topics';
