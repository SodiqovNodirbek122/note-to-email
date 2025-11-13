import Handlebars from 'handlebars';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import * as marked from 'marked';
import { Note, EmailTemplate } from '../types';

// Setup DOMPurify with JSDOM for server-side HTML sanitization
const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

// Configure marked for safe markdown parsing
marked.setOptions({
  breaks: true,
  gfm: true,
});

export class TemplateEngine {
  private extractNoteVariables(note: Note): Record<string, any> {
    const variables: Record<string, any> = {
      // Note metadata
      note_title: note.title,
      note_content: note.content,
      note_content_html: this.markdownToHtml(note.content),
      note_created_at: note.created_at.toISOString(),
      note_updated_at: note.updated_at.toISOString(),
      
      // Date helpers
      today: new Date().toISOString().split('T')[0],
      now: new Date().toISOString(),
      
      // Common formatting
      current_year: new Date().getFullYear(),
      current_month: new Date().toLocaleString('default', { month: 'long' }),
      current_date: new Date().toLocaleDateString(),
    };

    // Try to extract custom variables from note content
    // Look for patterns like {{variable_name}} in the note content
    const customVariableMatches = note.content.match(/\{\{([^}]+)\}\}/g);
    if (customVariableMatches) {
      customVariableMatches.forEach(match => {
        const variableName = match.replace(/[{}]/g, '').trim();
        if (!variables[variableName]) {
          variables[variableName] = `[${variableName}]`; // Placeholder for missing variables
        }
      });
    }

    return variables;
  }

    private markdownToHtml(markdown: string): string {
    const html = marked.parse(markdown);
    return purify.sanitize(html);
  }

 
  private sanitizeHtml(html: string): string {
    return purify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'table', 'thead', 'tbody',
        'tr', 'td', 'th', 'div', 'span', 'pre', 'code'
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style'],
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
  }


  public renderTemplate(template: EmailTemplate, note: Note): { subject: string; body_html: string; body_text: string; variables_used: Record<string, any> } {
    const variables = this.extractNoteVariables(note);
    
    // Compile templates
    const subjectTemplate = Handlebars.compile(template.subject);
    const bodyTemplate = Handlebars.compile(template.body);
    
    // Render templates
    const subject = subjectTemplate(variables);
    const bodyHtml = bodyTemplate(variables);
    
    // Sanitize HTML output
    const sanitizedHtml = this.sanitizeHtml(bodyHtml);
    
    // Generate plain text version
    const bodyText = this.htmlToText(sanitizedHtml);
    
    return {
      subject,
      body_html: sanitizedHtml,
      body_text: bodyText,
      variables_used: variables
    };
  }

  /**
   * Convert HTML to plain text
   */
  private htmlToText(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
  }

  /**
   * Validate template syntax
   */
  public validateTemplate(subject: string, body: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      Handlebars.compile(subject);
    } catch (error) {
      errors.push(`Subject template error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    try {
      Handlebars.compile(body);
    } catch (error) {
      errors.push(`Body template error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Extract variable names from template
   */
  public extractTemplateVariables(subject: string, body: string): string[] {
    const variables = new Set<string>();
    const content = subject + ' ' + body;
    
    // Match Handlebars variables: {{variable}} or {{#each variable}}
    const matches = content.match(/\{\{[^}]+\}\}/g);
    
    if (matches) {
      matches.forEach(match => {
        const variable = match
          .replace(/[{}]/g, '')
          .replace(/^#each\s+/, '')
          .replace(/^if\s+/, '')
          .replace(/^unless\s+/, '')
          .trim()
          .split('.')[0]; // Take only the root variable name
        
        if (variable && !variable.startsWith('/') && variable !== 'this') {
          variables.add(variable);
        }
      });
    }
    
    return Array.from(variables);
  }
}
