-- Add credits field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN credits INTEGER NOT NULL DEFAULT 0;
