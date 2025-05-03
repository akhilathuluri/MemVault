import { supabase } from '../lib/supabase';
import { SharedItem } from '../types/database.types';

export const shareService = {
  async createShare(itemId: string, itemType: 'memory' | 'file', expiresInDays?: number): Promise<SharedItem> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const shareToken = crypto.randomUUID();
    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString() : null;

    const { data, error } = await supabase
      .from('shared_items')
      .insert({
        item_id: itemId,
        item_type: itemType,
        created_by: user.id,
        expires_at: expiresAt,
        is_active: true,
        share_token: shareToken
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getSharedItem(token: string): Promise<SharedItem | null> {
    const { data, error } = await supabase
      .from('shared_items')
      .select('*')
      .eq('share_token', token)
      .eq('is_active', true)
      .single();

    if (error) return null;
    return data;
  },

  async deleteShare(shareId: string): Promise<void> {
    const { error } = await supabase
      .from('shared_items')
      .delete()
      .eq('id', shareId);

    if (error) throw error;
  },

  async getUserShares(): Promise<SharedItem[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('shared_items')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}; 