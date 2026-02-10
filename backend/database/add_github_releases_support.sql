-- Migration: Add GitHub Releases support to topic_books table
-- This adds fields to track PDFs stored in GitHub Releases

-- Add new columns for GitHub Release storage
ALTER TABLE topic_books
ADD COLUMN IF NOT EXISTS storage_type VARCHAR(50) DEFAULT 'supabase_storage',
ADD COLUMN IF NOT EXISTS github_asset_id BIGINT,
ADD COLUMN IF NOT EXISTS github_release_tag VARCHAR(100);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_topic_books_storage_type ON topic_books(storage_type);
CREATE INDEX IF NOT EXISTS idx_topic_books_github_asset_id ON topic_books(github_asset_id);

-- Add comment for documentation
COMMENT ON COLUMN topic_books.storage_type IS 'Storage method: supabase_storage or github_release';
COMMENT ON COLUMN topic_books.github_asset_id IS 'GitHub Release asset ID for deletion';
COMMENT ON COLUMN topic_books.github_release_tag IS 'GitHub Release tag name (e.g., pdf-storage-v1)';

-- Update existing records to have explicit storage_type
UPDATE topic_books
SET storage_type = 'supabase_storage'
WHERE storage_type IS NULL;
