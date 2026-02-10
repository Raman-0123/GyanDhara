-- Add cover_image field to topics table for book covers
ALTER TABLE topics 
ADD COLUMN IF NOT EXISTS cover_image TEXT,
ADD COLUMN IF NOT EXISTS estimated_read_time INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS quiz_count INTEGER DEFAULT 0;

-- Update existing topic with placeholder
UPDATE topics 
SET cover_image = 'https://via.placeholder.com/300x400/4F46E5/ffffff?text=' || SUBSTRING(title, 1, 1)
WHERE cover_image IS NULL;
