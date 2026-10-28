-- Add card_scenes table for storing card scenes
CREATE TABLE public.card_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.cards (id) ON DELETE CASCADE,
  scene_order INTEGER NOT NULL,
  scene_type TEXT NOT NULL CHECK (scene_type IN ('text', 'image', 'audio', 'video')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add view_count and unlock_at to cards table
ALTER TABLE public.cards 
ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN unlock_at TIMESTAMPTZ;

-- Create reactions table for recipient responses
CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.cards (id) ON DELETE CASCADE,
  reaction_type TEXT CHECK (reaction_type IN ('heart', 'thumbs_up', 'smile', 'love', 'thank_you')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_card_scenes_card_id ON public.card_scenes (card_id);
CREATE INDEX idx_card_scenes_order ON public.card_scenes (card_id, scene_order);
CREATE INDEX idx_reactions_card_id ON public.reactions (card_id);

-- Enable RLS
ALTER TABLE public.card_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for card_scenes
CREATE POLICY "Users can view own card scenes"
  ON public.card_scenes
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cards 
    WHERE cards.id = card_scenes.card_id 
    AND cards.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own card scenes"
  ON public.card_scenes
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cards 
    WHERE cards.id = card_scenes.card_id 
    AND cards.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own card scenes"
  ON public.card_scenes
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cards 
    WHERE cards.id = card_scenes.card_id 
    AND cards.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cards 
    WHERE cards.id = card_scenes.card_id 
    AND cards.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own card scenes"
  ON public.card_scenes
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cards 
    WHERE cards.id = card_scenes.card_id 
    AND cards.user_id = auth.uid()
  ));

CREATE POLICY "Public can view card scenes by hash_id"
  ON public.card_scenes
  FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cards 
    WHERE cards.id = card_scenes.card_id 
    AND cards.hash_id IS NOT NULL
  ));

-- RLS policies for reactions
CREATE POLICY "Public can view reactions"
  ON public.reactions
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

CREATE POLICY "Anyone can insert reactions"
  ON public.reactions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (TRUE);

CREATE POLICY "Admins can delete reactions"
  ON public.reactions
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
