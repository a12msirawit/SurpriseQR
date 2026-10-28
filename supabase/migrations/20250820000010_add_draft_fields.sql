-- Add draft status and expiration fields
ALTER TABLE cards
ADD COLUMN status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published')),
ADD COLUMN draft_expires_at TIMESTAMP WITH TIME ZONE;

-- Add index for draft cleanup
CREATE INDEX idx_cards_draft_expires_at ON cards(draft_expires_at) WHERE status = 'draft';
