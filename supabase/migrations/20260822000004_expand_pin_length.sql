ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_pin_code_check;
ALTER TABLE public.cards ADD CONSTRAINT cards_pin_code_check CHECK (pin_code IS NULL OR pin_code ~ '^\d{4,8}$');