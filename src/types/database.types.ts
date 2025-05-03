export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      memory_items: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          category: string
          tags: string[]
          created_at: string
          updated_at: string
          reminder_at: string | null
          is_pinned: boolean
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content: string
          category: string
          tags?: string[]
          created_at?: string
          updated_at?: string
          reminder_at?: string | null
          is_pinned?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string
          category?: string
          tags?: string[]
          created_at?: string
          updated_at?: string
          reminder_at?: string | null
          is_pinned?: boolean
        }
      }
      files: {
        Row: {
          id: string
          user_id: string
          name: string
          file_path: string
          type: string
          size: number
          keywords: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          file_path: string
          type: string
          size: number
          keywords?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          file_path?: string
          type?: string
          size?: number
          keywords?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          user_id: string
          action: string
          details: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          details: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          details?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export interface SharedItem {
  id: string;
  item_id: string;
  item_type: 'memory' | 'file';
  created_at: string;
  created_by: string;
  expires_at?: string;
  is_active: boolean;
  share_token: string;
}

export interface Memory {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  reminder_at: string | null;
  is_pinned: boolean;
}

export interface File {
  id: string;
  user_id: string;
  name: string;
  file_path: string;
  type: string;
  size: number;
  keywords: string[];
  created_at: string;
  updated_at: string;
}