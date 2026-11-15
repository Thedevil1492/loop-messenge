export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  is_online: number;
  last_seen_at: number;
  created_at: number;
  anon_tag?: string;
  public_key?: string;
  persona_type?: string;
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
  participants: User[];
  last_message: Message | null;
  unread_count: number;
}

export interface MessageReplyInfo {
  id: string;
  sender_name?: string;
  content?: string;
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
  clientMessageId?: string;
  reply_to?: MessageReplyInfo | Message | null;
  reactions?: Record<string, string[]>; // emoji -> array of user_ids
}

export type ActiveTab = 'CHATS' | 'STATUS' | 'CALLS' | 'SETTINGS';

export interface StatusStory {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  media_url?: string;
  text?: string;
  created_at: number;
  viewed: boolean;
}

export interface CallLogItem {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  type: 'AUDIO' | 'VIDEO';
  direction: 'INCOMING' | 'OUTGOING' | 'MISSED';
  timestamp: number;
}

export interface WsEvent<T = any> {
  type: string;
  payload: T;
}
