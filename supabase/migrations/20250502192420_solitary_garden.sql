/*
  # Fix storage policies for file uploads

  1. Changes
    - Add storage bucket policies for authenticated users
    - Allow users to manage their own files in storage
*/

-- Create storage bucket if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('files', 'files', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Enable RLS for storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create storage policies
DO $$ 
BEGIN
  -- Policy for inserting files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can upload files'
  ) THEN
    CREATE POLICY "Users can upload files"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  -- Policy for reading files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can view files'
  ) THEN
    CREATE POLICY "Users can view files"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  -- Policy for updating files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can update files'
  ) THEN
    CREATE POLICY "Users can update files"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  -- Policy for deleting files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can delete files'
  ) THEN
    CREATE POLICY "Users can delete files"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;