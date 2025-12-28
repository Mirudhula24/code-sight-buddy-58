-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Create an index for vector similarity search on existing embedding column
-- The embedding column already exists as vector type
CREATE INDEX IF NOT EXISTS idx_code_chunks_embedding ON public.code_chunks 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Add metadata column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'code_chunks' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.code_chunks ADD COLUMN metadata jsonb;
  END IF;
END $$;