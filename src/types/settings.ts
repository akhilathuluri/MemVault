export interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
  app_metadata: {
    provider?: string;
    providers?: string[];
  };
}

export interface LoginActivity {
  id: string;
  user_id: string;
  timestamp: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  location?: string;
}

export interface StorageStats {
  used_space: number;
  total_space: number;
  item_count: number;
  file_count: number;
}