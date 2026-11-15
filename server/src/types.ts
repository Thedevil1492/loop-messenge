export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  is_online: number;
  last_seen_at: number;
  created_at: number;
  username?: string;
  phone?: string;
  anon_tag?: string;
  public_key?: string;
  persona_type?: string;
  is_admin?: number;
}

export interface Chat {
  id: string;
  type: 'DIRECT' | 'GROUP';
  name: string | null;
  avatar_url: string;
  description: string;
  created_by: string;
  created_at: number;
  updated_at: number;
  // Computed for client
  participants?: User[];
  last_message?: Message | null;
  unread_count?: number;
}

export interface ChatParticipant {
  id: string;
  chat_id: string;
  user_id: string;
  role: 'ADMIN' | 'MEMBER';
  joined_at: number;
  last_read_at: number;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_name?: string;
  sender_avatar?: string;
  parent_message_id?: string | null;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO';
  content: string;
  media_url?: string | null;
  media_mime_type?: string | null;
  media_size?: number | null;
  media_name?: string | null;
  is_deleted: number;
  created_at: number;
  updated_at: number;
  delivery_status?: 'SENT' | 'DELIVERED' | 'READ';
}

export interface DeliveryReceipt {
  id: string;
  message_id: string;
  recipient_id: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  updated_at: number;
}
