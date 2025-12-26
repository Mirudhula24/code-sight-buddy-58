-- Add sharing columns to analyses table
ALTER TABLE public.analyses 
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS share_token text UNIQUE;

-- Create index for faster share_token lookups
CREATE INDEX IF NOT EXISTS idx_analyses_share_token ON public.analyses(share_token) WHERE share_token IS NOT NULL;

-- Create RLS policy for public read access to shared analyses
CREATE POLICY "Anyone can view public analyses" 
ON public.analyses 
FOR SELECT 
USING (is_public = true AND share_token IS NOT NULL);