import { supabase } from '../lib/supabase';
import type { MemoryNotification } from '../types/notifications';

export interface NotificationPreferences {
  browser_notifications_enabled: boolean;
  email_notifications_enabled: boolean;
}

export const notificationService = {
  async getActiveReminders(userId: string): Promise<MemoryNotification[]> {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('memory_items')
      .select('id, title, category, reminder_at, created_at')
      .eq('user_id', userId)
      .not('reminder_at', 'is', null)
      .gte('reminder_at', now)
      .order('reminder_at', { ascending: true })
      .limit(5);

    if (error) throw error;
    return data || [];
  },

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no preferences exist, create default ones
      if (error.code === 'PGRST116') {
        return this.createDefaultPreferences(userId);
      }
      throw error;
    }

    return data;
  },

  async updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void> {
    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  },

  async createDefaultPreferences(userId: string): Promise<NotificationPreferences> {
    const defaultPreferences: NotificationPreferences = {
      browser_notifications_enabled: false,
      email_notifications_enabled: true
    };

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        ...defaultPreferences,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return data || defaultPreferences;
  },

  async requestBrowserNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  async sendBrowserNotification(title: string, options: NotificationOptions = {}): Promise<void> {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    if (Notification.permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    new Notification(title, {
      icon: '/favicon.ico',
      ...options
    });
  }
};