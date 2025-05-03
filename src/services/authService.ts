import { supabase } from '../lib/supabase';

export const authService = {
  async trackLoginActivity(userId: string) {
    try {
      // Update existing sessions to not be current
      const { error: updateError } = await supabase
        .from('auth_sessions')
        .update({ is_current: false })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Create new session with basic info
      const { error: sessionError } = await supabase
        .from('auth_sessions')
        .insert({
          user_id: userId,
          user_agent: navigator.userAgent,
          is_current: true
        });

      if (sessionError) throw sessionError;

      // Update or create user profile
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          email: (await supabase.auth.getUser()).data.user?.email,
          last_sign_in_at: new Date().toISOString(),
          sign_in_count: existingProfile ? (existingProfile.sign_in_count || 0) + 1 : 1
        });

      if (profileError) throw profileError;

    } catch (error) {
      console.error('Error tracking login activity:', error);
    }
  }
};