-- Add monetization fields to cards table
ALTER TABLE public.cards 
ADD COLUMN template_cost INTEGER NOT NULL DEFAULT 0,
ADD COLUMN storage_type TEXT NOT NULL DEFAULT '14_days' CHECK (storage_type IN ('14_days', 'permanent')),
ADD COLUMN storage_cost INTEGER NOT NULL DEFAULT 0,
ADD COLUMN expires_at TIMESTAMPTZ;

-- Create index for expired cards cleanup
CREATE INDEX idx_cards_expires_at ON public.cards(expires_at) WHERE expires_at IS NOT NULL;
