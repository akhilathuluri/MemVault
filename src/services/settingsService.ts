import { supabase } from '../lib/supabase';
import { StorageStats, LoginActivity } from '../types/settings';

export const settingsService = {
  async getStorageStats(userId: string): Promise<StorageStats> {
    try {
      // Get files storage data with proper user filtering
      const { data: files, error: filesError } = await supabase
        .storage
        .from('files')
        .list(`${userId}/`, {
          limit: 1000
        });

      if (filesError) throw filesError;

      // Get memory items count with proper user filtering
      const { count: itemCount, error: itemsError } = await supabase
        .from('memory_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (itemsError) throw itemsError;

      // Calculate total storage used, ensuring we handle undefined metadata
      const totalBytes = files?.reduce((acc, file) => {
        const size = file.metadata?.size;
        return acc + (typeof size === 'number' ? size : 0);
      }, 0) || 0;

      return {
        used_space: totalBytes,
        total_space: 100 * 1024 * 1024, // 100MB
        item_count: itemCount || 0,
        file_count: files?.length || 0
      };
    } catch (error) {
      console.error('Error fetching storage stats:', error);
      // Return default values in case of error
      return {
        used_space: 0,
        total_space: 100 * 1024 * 1024,
        item_count: 0,
        file_count: 0
      };
    }
  },

  async getLoginActivity(userId: string): Promise<LoginActivity[]> {
    const { data, error } = await supabase
      .from('auth_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    // Transform the data to match LoginActivity interface
    return (data || []).map(session => ({
      id: session.id,
      user_id: session.user_id,
      timestamp: session.created_at,
      ip_address: session.ip_address || 'Unknown',
      user_agent: this.parseUserAgent(session.user_agent || ''),
      location: session.location || 'Unknown location',
      created_at: session.created_at
    }));
  },

  // Helper function to parse user agent string
  parseUserAgent(ua: string): string {
    if (!ua) return 'Unknown browser';
    
    // Basic user agent parsing
    if (ua.includes('Firefox')) return 'Firefox Browser';
    if (ua.includes('Chrome')) return 'Chrome Browser';
    if (ua.includes('Safari')) return 'Safari Browser';
    if (ua.includes('Edge')) return 'Edge Browser';
    return 'Web Browser';
  }
};