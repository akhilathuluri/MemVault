import { Session } from '@supabase/supabase-js';

export const isSessionValid = (session: Session | null): boolean => {
  if (!session) return false;
  
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = session.expires_at;
  
  // Check if session is expired or about to expire in next 5 minutes
  return expiresAt ? expiresAt > (now + 300) : false;
};