/*
  # Initial schema for MemVault application

  1. New Tables
    - `memory_items`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `title` (text, not null)
      - `content` (text, not null)
      - `category` (text, not null)
      - `tags` (text[], default empty array)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
      - `reminder_at` (timestamptz, nullable)
      - `is_pinned` (boolean, default false)
    
    - `files`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text, not null)
      - `file_path` (text, not null)
      - `type` (text, not null)
      - `size` (integer, not null)
      - `keywords` (text[], default empty array)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
    
    - `activities`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `action` (text, not null)
      - `details` (text, not null)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on all tables
    - Add policies to allow users to only access their own data
*/

-- Memory Items Table
CREATE TABLE IF NOT EXISTS memory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  reminder_at timestamptz DEFAULT NULL,
  is_pinned boolean DEFAULT false NOT NULL
);

-- Files Table
CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  file_path text NOT NULL,
  type text NOT NULL,
  size integer NOT NULL,
  keywords text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Activities Table
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  details text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE memory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Policies for memory_items
CREATE POLICY "Users can view their own memory items"
  ON memory_items
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own memory items"
  ON memory_items
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memory items"
  ON memory_items
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memory items"
  ON memory_items
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for files
CREATE POLICY "Users can view their own files"
  ON files
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own files"
  ON files
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files"
  ON files
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
  ON files
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for activities
CREATE POLICY "Users can view their own activities"
  ON activities
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activities"
  ON activities
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_memory_items_updated_at
BEFORE UPDATE ON memory_items
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_files_updated_at
BEFORE UPDATE ON files
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

-- Create trigger for logging memory_items activities
CREATE OR REPLACE FUNCTION log_memory_item_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activities (user_id, action, details)
    VALUES (NEW.user_id, 'Added memory item', 'Added "' || NEW.title || '"');
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activities (user_id, action, details)
    VALUES (NEW.user_id, 'Updated memory item', 'Updated "' || NEW.title || '"');
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activities (user_id, action, details)
    VALUES (OLD.user_id, 'Deleted memory item', 'Deleted "' || OLD.title || '"');
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_memory_item
AFTER INSERT OR UPDATE OR DELETE ON memory_items
FOR EACH ROW
EXECUTE PROCEDURE log_memory_item_activity();

-- Create trigger for logging files activities
CREATE OR REPLACE FUNCTION log_file_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activities (user_id, action, details)
    VALUES (NEW.user_id, 'Uploaded file', 'Uploaded "' || NEW.name || '"');
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activities (user_id, action, details)
    VALUES (NEW.user_id, 'Updated file', 'Updated "' || NEW.name || '"');
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activities (user_id, action, details)
    VALUES (OLD.user_id, 'Deleted file', 'Deleted "' || OLD.name || '"');
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_file
AFTER INSERT OR UPDATE OR DELETE ON files
FOR EACH ROW
EXECUTE PROCEDURE log_file_activity();