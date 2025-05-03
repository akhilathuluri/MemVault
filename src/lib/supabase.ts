import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase credentials. Please connect to Supabase to get your API keys.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export type MemoryItem = Database['public']['Tables']['memory_items']['Row'];
export type FileItem = Database['public']['Tables']['files']['Row'];
export type Activity = Database['public']['Tables']['activities']['Row'];

export async function getDashboardStats(): Promise<DatabaseStats> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const [
    { count: memoryCount },
    { count: filesCount },
    { data: activities }
  ] = await Promise.all([
    supabase
      .from('memory_items')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('files')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
  ]);

  const { data: files } = await supabase
    .from('files')
    .select('size');

  const storageUsed = files?.reduce((total, file) => total + file.size, 0) || 0;

  return {
    memory_items_count: memoryCount || 0,
    files_count: filesCount || 0,
    storage_used: storageUsed,
    recent_activities: activities || []
  };
}

export async function getRecentMemoryItems(): Promise<MemoryItem[]> {
  const { data } = await supabase
    .from('memory_items')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);

  return data || [];
}

export async function getAllMemoryItems(): Promise<MemoryItem[]> {
  const { data, error } = await supabase
    .from('memory_items')
    .select('*')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createMemoryItem(item: Omit<MemoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<MemoryItem> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('memory_items')
    .insert([
      {
        ...item,
        user_id: user.id,
      }
    ])
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to create memory item');
  
  return data;
}

export async function updateMemoryItem(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('memory_items')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to update memory item');
  
  return data;
}

export async function deleteMemoryItem(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('memory_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function setMemoryItemReminder(id: string, reminderAt: string | null): Promise<MemoryItem> {
  return updateMemoryItem(id, { reminder_at: reminderAt });
}

export async function uploadFile(
  file: File,
  fileName: string,
  keywords: string[]
): Promise<FileItem> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const fileExt = file.name.split('.').pop();
  const filePath = `${user.id}/${Date.now()}.${fileExt}`;
  
  const { error: uploadError } = await supabase.storage
    .from('files')
    .upload(filePath, file, {
      upsert: false,
      cacheControl: '3600'
    });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('files')
    .getPublicUrl(filePath);

  const fileRecord = {
    user_id: user.id,
    name: fileName,
    file_path: publicUrl,
    type: file.type.startsWith('image/') ? 'image' : 'document',
    size: file.size,
    keywords,
  };

  const { data: fileData, error: dbError } = await supabase
    .from('files')
    .insert([fileRecord])
    .select()
    .single();

  if (dbError) {
    await supabase.storage
      .from('files')
      .remove([filePath]);
    throw dbError;
  }

  if (!fileData) throw new Error('Failed to create file record');

  return fileData;
}

export async function getAllFiles(): Promise<FileItem[]> {
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function deleteFile(id: string, filePath: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const storagePath = filePath.split('/').pop();
  if (storagePath) {
    const { error: storageError } = await supabase.storage
      .from('files')
      .remove([`${user.id}/${storagePath}`]);

    if (storageError) throw storageError;
  }

  const { error: dbError } = await supabase
    .from('files')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (dbError) throw dbError;
}

export async function searchWithAI(query: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Fetch relevant data for context
  const [memories, files] = await Promise.all([
    getAllMemoryItems(),
    getAllFiles()
  ]);

  // Create context from user's data
  const context = {
    memories: memories.map(m => ({
      title: m.title,
      content: m.content,
      category: m.category,
      tags: m.tags
    })),
    files: files.map(f => ({
      name: f.name,
      type: f.type,
      keywords: f.keywords
    }))
  };

  // Call the search edge function
  const response = await fetch(
    `${supabaseUrl}/functions/v1/search`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        query,
        context: JSON.stringify(context)
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to perform AI search');
  }

  const { result } = await response.json();
  return result;
}

export type DatabaseStats = {
  memory_items_count: number;
  files_count: number;
  storage_used: number;
  recent_activities: Activity[];
};