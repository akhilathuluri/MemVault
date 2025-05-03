-- Create user_credentials table for storing WebAuthn credentials
CREATE TABLE IF NOT EXISTS user_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  credential_id text NOT NULL,
  public_key text NOT NULL,
  device_name text,
  created_at timestamptz DEFAULT now() NOT NULL,
  last_used_at timestamptz,
  UNIQUE(user_id, credential_id)
);

-- Create auth_challenges table for storing WebAuthn challenges
CREATE TABLE IF NOT EXISTS auth_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge text NOT NULL,
  verified boolean DEFAULT false,
  assertion jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL
);

-- Enable Row Level Security
ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_challenges ENABLE ROW LEVEL SECURITY;

-- Create policies for user_credentials
CREATE POLICY "Users can view their own credentials"
  ON user_credentials
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own credentials"
  ON user_credentials
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credentials"
  ON user_credentials
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credentials"
  ON user_credentials
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for auth_challenges
CREATE POLICY "Users can view their own challenges"
  ON auth_challenges
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own challenges"
  ON auth_challenges
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenges"
  ON auth_challenges
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own challenges"
  ON auth_challenges
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to clean up expired challenges
CREATE OR REPLACE FUNCTION clean_expired_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM auth_challenges
  WHERE expires_at < now();
END;
$$;

-- Create a trigger to automatically clean up expired challenges
CREATE OR REPLACE FUNCTION trigger_clean_expired_challenges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM clean_expired_challenges();
  RETURN NEW;
END;
$$;

CREATE TRIGGER clean_expired_challenges_trigger
  AFTER INSERT ON auth_challenges
  EXECUTE FUNCTION trigger_clean_expired_challenges(); 