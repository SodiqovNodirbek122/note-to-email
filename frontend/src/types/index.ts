export interface User {
  id: string;
  email: string;
  name: string;
  has_gmail_auth: boolean;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  user_id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SentEmail {
  id: string;
  user_id: string;
  note_id: string;
  template_id: string;
  template_version: number;
  idempotency_key: string;
  recipients: string[];
  subject: string;
  body_html: string;
  body_text?: string;
  status: 'pending' | 'sent' | 'failed';
  error_message?: string;
  provider_message_id?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
  note_title?: string;
  template_name?: string;
}

export interface EmailPreview {
  subject: string;
  body_html: string;
  body_text?: string;
  variables_used: Record<string, any>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: string[];
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}
