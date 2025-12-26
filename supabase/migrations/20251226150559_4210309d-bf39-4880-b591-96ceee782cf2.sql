-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Create the repositories table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.repositories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_url text NOT NULL UNIQUE,
  repo_name text,
  metadata jsonb,
  ingestion_status text DEFAULT 'pending',
  chunks_count int DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view repositories
CREATE POLICY "Users can view all repositories" ON public.repositories
FOR SELECT USING (true);

-- Allow authenticated users to insert/update repositories
CREATE POLICY "Authenticated users can insert repositories" ON public.repositories
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update repositories" ON public.repositories
FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Create the code_chunks table
CREATE TABLE IF NOT EXISTS public.code_chunks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_id uuid NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  content text NOT NULL,
  embedding extensions.vector(1536),
  chunk_index int DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.code_chunks ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view code chunks
CREATE POLICY "Users can view all code chunks" ON public.code_chunks
FOR SELECT USING (true);

-- Allow authenticated users to insert code chunks
CREATE POLICY "Authenticated users can insert code chunks" ON public.code_chunks
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to delete code chunks (for re-ingestion)
CREATE POLICY "Authenticated users can delete code chunks" ON public.code_chunks
FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create index on embeddings for faster similarity search
CREATE INDEX IF NOT EXISTS code_chunks_embedding_idx ON public.code_chunks 
USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists = 100);

-- Create index on repo_id for filtering
CREATE INDEX IF NOT EXISTS code_chunks_repo_id_idx ON public.code_chunks (repo_id);

-- Create the vector similarity search function
CREATE OR REPLACE FUNCTION public.match_code_chunks(
  query_embedding extensions.vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10,
  p_repo_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  repo_id uuid,
  file_path text,
  content text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id,
    cc.repo_id,
    cc.file_path,
    cc.content,
    1 - (cc.embedding <=> query_embedding)::float AS similarity
  FROM public.code_chunks cc
  WHERE 
    (p_repo_id IS NULL OR cc.repo_id = p_repo_id)
    AND cc.embedding IS NOT NULL
    AND 1 - (cc.embedding <=> query_embedding) > match_threshold
  ORDER BY cc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create trigger for updated_at on repositories
CREATE TRIGGER update_repositories_updated_at
  BEFORE UPDATE ON public.repositories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();