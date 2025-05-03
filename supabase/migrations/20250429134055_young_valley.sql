/*
  # Initial Schema Setup

  1. New Tables
    - memory_items: Stores user memories and reminders
    - files: Stores file metadata
    - activities: Logs user actions
    - notification_preferences: Stores user notification settings
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
  
  3. Triggers
    - Automatic updated_at timestamp updates
    - Activity logging for memory items and files
*/

-- Create memory_items table
CREATE TABLE IF NOT EXISTS memory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  reminder_at timestamptz,
  is_pinned boolean DEFAULT false NOT NULL
);

-- Enable RLS for memory_items
ALTER TABLE memory_items ENABLE ROW LEVEL SECURITY;

-- Create policies for memory_items
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'memory_items' AND policyname = 'Users can create their own memory items'
  ) THEN
    CREATE POLICY "Users can create their own memory items"
      ON memory_items
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'memory_items' AND policyname = 'Users can view their own memory items'
  ) THEN
    CREATE POLICY "Users can view their own memory items"
      ON memory_items
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'memory_items' AND policyname = 'Users can update their own memory items'
  ) THEN
    CREATE POLICY "Users can update their own memory items"
      ON memory_items
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'memory_items' AND policyname = 'Users can delete their own memory items'
  ) THEN
    CREATE POLICY "Users can delete their own memory items"
      ON memory_items
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create files table
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

-- Enable RLS for files
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Create policies for files
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'files' AND policyname = 'Users can create their own files'
  ) THEN
    CREATE POLICY "Users can create their own files"
      ON files
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'files' AND policyname = 'Users can view their own files'
  ) THEN
    CREATE POLICY "Users can view their own files"
      ON files
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'files' AND policyname = 'Users can update their own files'
  ) THEN
    CREATE POLICY "Users can update their own files"
      ON files
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'files' AND policyname = 'Users can delete their own files'
  ) THEN
    CREATE POLICY "Users can delete their own files"
      ON files
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  details text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS for activities
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Create policies for activities
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'activities' AND policyname = 'Users can create their own activities'
  ) THEN
    CREATE POLICY "Users can create their own activities"
      ON activities
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'activities' AND policyname = 'Users can view their own activities'
  ) THEN
    CREATE POLICY "Users can view their own activities"
      ON activities
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for memory_items updated_at
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_memory_items_updated_at'
  ) THEN
    CREATE TRIGGER update_memory_items_updated_at
      BEFORE UPDATE ON memory_items
      FOR EACH ROW
      EXECUTE FUNCTION update_modified_column();
  END IF;
END $$;

-- Create trigger for files updated_at
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_files_updated_at'
  ) THEN
    CREATE TRIGGER update_files_updated_at
      BEFORE UPDATE ON files
      FOR EACH ROW
      EXECUTE FUNCTION update_modified_column();
  END IF;
END $$;

-- Create function to log memory item activity
CREATE OR REPLACE FUNCTION log_memory_item_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activities (user_id, action, details)
    VALUES (NEW.user_id, 'created_memory', NEW.title);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activities (user_id, action, details)
    VALUES (NEW.user_id, 'updated_memory', NEW.title);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activities (user_id, action, details)
    VALUES (OLD.user_id, 'deleted_memory', OLD.title);
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Create trigger for memory item activity logging
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'log_memory_item'
  ) THEN
    CREATE TRIGGER log_memory_item
      AFTER INSERT OR UPDATE OR DELETE ON memory_items
      FOR EACH ROW
      EXECUTE FUNCTION log_memory_item_activity();
  END IF;
END $$;

-- Create function to log file activity
CREATE OR REPLACE FUNCTION log_file_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activities (user_id, action, details)
    VALUES (NEW.user_id, 'uploaded_file', NEW.name);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activities (user_id, action, details)
    VALUES (NEW.user_id, 'updated_file', NEW.name);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activities (user_id, action, details)
    VALUES (OLD.user_id, 'deleted_file', OLD.name);
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Create trigger for file activity logging
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'log_file'
  ) THEN
    CREATE TRIGGER log_file
      AFTER INSERT OR UPDATE OR DELETE ON files
      FOR EACH ROW
      EXECUTE FUNCTION log_file_activity();
  END IF;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  browser_notifications_enabled boolean DEFAULT false NOT NULL,
  email_notifications_enabled boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Enable RLS for notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for notification_preferences
CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER set_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();