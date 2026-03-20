-- Add preview_urls column to store up to 4 image URLs for public arena cards
ALTER TABLE published_arenas
ADD COLUMN IF NOT EXISTS preview_urls text[] DEFAULT '{}';