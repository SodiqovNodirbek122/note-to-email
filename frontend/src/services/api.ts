import { ApiResponse, Note, EmailTemplate, SentEmail, EmailPreview } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class ApiService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: this.getAuthHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string, name: string) {
    return this.request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async getGmailAuthUrl() {
    return this.request<{ auth_url: string }>('/auth/gmail/auth-url');
  }

  async handleGmailCallback(code: string) {
    return this.request('/auth/gmail/callback', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async getGmailStatus() {
    return this.request<{ has_gmail_auth: boolean }>('/auth/gmail/status');
  }

  // Nylas auth methods
  async getNylasAuthUrl() {
    return this.request<{ auth_url: string }>('/auth/nylas/auth-url');
  }

  async handleNylasCallback(code: string) {
    return this.request('/auth/nylas/callback', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async getNylasStatus() {
    return this.request<{ has_nylas_auth: boolean; account_email: string | null }>('/auth/nylas/status');
  }

  async revokeNylasAuth() {
    return this.request('/auth/nylas/revoke', {
      method: 'POST',
    });
  }

  // Notes endpoints
  async getNotes() {
    return this.request<Note[]>('/notes');
  }

  async getNote(id: string) {
    return this.request<Note>(`/notes/${id}`);
  }

  async createNote(title: string, content: string) {
    return this.request<Note>('/notes', {
      method: 'POST',
      body: JSON.stringify({ title, content }),
    });
  }

  async updateNote(id: string, title: string, content: string) {
    return this.request<Note>(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, content }),
    });
  }

  async deleteNote(id: string) {
    return this.request(`/notes/${id}`, {
      method: 'DELETE',
    });
  }

  // Templates endpoints
  async getTemplates() {
    return this.request<EmailTemplate[]>('/templates');
  }

  async getTemplate(id: string) {
    return this.request<EmailTemplate>(`/templates/${id}`);
  }

  async createTemplate(name: string, subject: string, body: string) {
    return this.request<EmailTemplate>('/templates', {
      method: 'POST',
      body: JSON.stringify({ name, subject, body }),
    });
  }

  async updateTemplate(id: string, name: string, subject: string, body: string) {
    return this.request<EmailTemplate>(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, subject, body }),
    });
  }

  async deleteTemplate(id: string) {
    return this.request(`/templates/${id}`, {
      method: 'DELETE',
    });
  }

  async previewTemplate(templateId: string, noteId: string) {
    return this.request<EmailPreview>(`/templates/${templateId}/preview/${noteId}`, {
      method: 'POST',
    });
  }

  // Email endpoints
  async sendEmail(noteId: string, templateId: string, recipients: string[], idempotencyKey?: string) {
    return this.request<{ id: string; status: string; message: string; message_id?: string }>('/emails/send', {
      method: 'POST',
      body: JSON.stringify({
        note_id: noteId,
        template_id: templateId,
        recipients,
        idempotency_key: idempotencyKey,
      }),
    });
  }

  async getSentEmails(page = 1, limit = 20) {
    return this.request<{
      emails: SentEmail[];
      total: number;
      page: number;
      limit: number;
    }>(`/emails/sent?page=${page}&limit=${limit}`);
  }

  async getSentEmail(id: string) {
    return this.request<SentEmail>(`/emails/sent/${id}`);
  }

  async retryEmail(id: string) {
    return this.request<{ id: string; status: string; message: string; message_id?: string }>(`/emails/sent/${id}/retry`, {
      method: 'POST',
    });
  }
}

export const apiService = new ApiService();
