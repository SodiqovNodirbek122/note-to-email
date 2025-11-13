import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  name: string;
  gmail_refresh_token?: string;
  gmail_access_token?: string;
  gmail_token_expires_at?: Date;
  nylas_access_token?: string;
  nylas_account_id?: string;
  has_nylas_auth?: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string; // Markdown
  created_at: Date;
  updated_at: Date;
}

export interface EmailTemplate {
  id: string;
  user_id: string;
  name: string;
  subject: string;
  body: string; // Handlebars template
  variables: string[]; // Variable names for hints
  version: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface EmailTemplateVersion {
  id: string;
  template_id: string;
  version: number;
  subject: string;
  body: string;
  variables: string[];
  created_at: Date;
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
  sent_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface AuthRequest extends Request {
  user?: User;
}

export interface EmailPreview {
  subject: string;
  body_html: string;
  body_text?: string;
  variables_used: Record<string, any>;
}

export interface SendEmailRequest {
  note_id: string;
  template_id: string;
  recipients: string[];
  idempotency_key?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
