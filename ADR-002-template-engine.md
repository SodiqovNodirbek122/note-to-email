# ADR-002: Template Engine and HTML Sanitization Strategy

## Status
Accepted

## Context
The application needs a robust template engine that can merge note data into email templates while ensuring security against XSS attacks and maintaining email compatibility. The system must handle both HTML rendering and plain text generation.

## Decision
We will use **Handlebars.js with DOMPurify sanitization** for the following reasons:

### Chosen Solution: Handlebars + DOMPurify + JSDOM
```javascript
// Template compilation and rendering
const template = Handlebars.compile(templateString);
const rendered = template(variables);

// Server-side HTML sanitization
const window = new JSDOM('').window;
const purify = DOMPurify(window);
const sanitized = purify.sanitize(rendered, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title']
});
```

## Template Engine Comparison

### 1. Handlebars.js (Chosen)
**Pros:**
- Logic-less templates prevent code injection
- Excellent performance with compilation caching
- Rich helper system for formatting
- Wide adoption and community support
- Built-in escaping for security

**Cons:**
- Learning curve for complex templates
- Limited built-in helpers

### 2. Mustache
**Pros:**
- Extremely simple syntax
- Language agnostic
- Very secure (logic-less)

**Cons:**
- Too limited for complex email templates
- No built-in helpers
- Poor handling of complex data structures

### 3. EJS
**Pros:**
- JavaScript syntax familiar to developers
- Very flexible

**Cons:**
- Allows arbitrary code execution (security risk)
- More complex to secure properly
- Performance overhead

### 4. Pug (Jade)
**Pros:**
- Clean, concise syntax
- Good performance

**Cons:**
- Steep learning curve
- Not ideal for email HTML
- Whitespace sensitivity issues

## Sanitization Strategy

### HTML Sanitization with DOMPurify
```javascript
const sanitizationConfig = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'table', 'thead', 'tbody',
    'tr', 'td', 'th', 'div', 'span', 'pre', 'code'
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style'],
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick']
};
```

### Why DOMPurify Over Alternatives

#### vs. sanitize-html
- **Performance**: DOMPurify is faster for large content
- **Security**: More actively maintained and audited
- **Flexibility**: Better configuration options

#### vs. xss
- **Completeness**: DOMPurify handles more edge cases
- **Email Compatibility**: Better handling of email-specific HTML

#### vs. Custom Regex Solutions
- **Security**: Regex-based sanitization is notoriously vulnerable
- **Maintenance**: DOMPurify handles new attack vectors automatically

## Variable System Design

### Available Variables
```javascript
const noteVariables = {
  // Note metadata
  note_title: note.title,
  note_content: note.content,
  note_content_html: markdownToHtml(note.content),
  note_created_at: note.created_at.toISOString(),
  note_updated_at: note.updated_at.toISOString(),
  
  // Date helpers
  today: new Date().toISOString().split('T')[0],
  now: new Date().toISOString(),
  current_year: new Date().getFullYear(),
  current_month: new Date().toLocaleString('default', { month: 'long' }),
  current_date: new Date().toLocaleDateString(),
};
```

### Variable Extraction
```javascript
public extractTemplateVariables(subject: string, body: string): string[] {
  const variables = new Set<string>();
  const content = subject + ' ' + body;
  
  // Match Handlebars variables: {{variable}}
  const matches = content.match(/\{\{[^}]+\}\}/g);
  
  if (matches) {
    matches.forEach(match => {
      const variable = match
        .replace(/[{}]/g, '')
        .replace(/^#each\s+/, '')
        .replace(/^if\s+/, '')
        .trim()
        .split('.')[0];
      
      if (variable && !variable.startsWith('/')) {
        variables.add(variable);
      }
    });
  }
  
  return Array.from(variables);
}
```

## Markdown Integration

### Markdown to HTML Conversion
```javascript
import { marked } from 'marked';

// Configure marked for safe parsing
marked.setOptions({
  breaks: true,
  gfm: true,
  sanitize: false, // We handle sanitization separately
});

private markdownToHtml(markdown: string): string {
  const html = marked(markdown);
  return this.sanitizeHtml(html);
}
```

### Why Marked Over Alternatives
- **Performance**: Fast parsing of large documents
- **GitHub Flavored Markdown**: Support for tables, strikethrough, etc.
- **Extensibility**: Plugin system for custom features
- **Security**: Works well with our sanitization strategy

## Plain Text Generation

### HTML to Text Conversion
```javascript
private htmlToText(html: string): string {
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
```

## Security Considerations

### Template Injection Prevention
- **Logic-less Templates**: Handlebars prevents code execution
- **Variable Validation**: Strict validation of variable names
- **Sandbox Execution**: Templates run in isolated context

### XSS Prevention
- **Input Sanitization**: All user input sanitized before storage
- **Output Encoding**: HTML entities encoded in templates
- **Content Security Policy**: Strict CSP headers for admin interfaces

### Email-Specific Security
- **Image Filtering**: Only allow images from trusted sources
- **Link Validation**: Validate and sanitize all href attributes
- **Style Restrictions**: Limited inline styles only

## Performance Optimizations

### Template Compilation Caching
```javascript
private templateCache = new Map<string, HandlebarsTemplateDelegate>();

private getCompiledTemplate(templateString: string): HandlebarsTemplateDelegate {
  const hash = crypto.createHash('md5').update(templateString).digest('hex');
  
  if (!this.templateCache.has(hash)) {
    this.templateCache.set(hash, Handlebars.compile(templateString));
  }
  
  return this.templateCache.get(hash)!;
}
```

### Sanitization Caching
- Cache sanitized HTML for identical content
- Invalidate cache on template changes
- Memory-efficient LRU cache implementation

## Error Handling

### Template Validation
```javascript
public validateTemplate(subject: string, body: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    Handlebars.compile(subject);
  } catch (error) {
    errors.push(`Subject template error: ${error.message}`);
  }
  
  try {
    Handlebars.compile(body);
  } catch (error) {
    errors.push(`Body template error: ${error.message}`);
  }
  
  return { valid: errors.length === 0, errors };
}
```

### Runtime Error Handling
- Graceful degradation for missing variables
- Detailed error logging for debugging
- User-friendly error messages

## Consequences

### Positive
- **Security**: Robust protection against XSS and injection attacks
- **Performance**: Fast template compilation and rendering
- **Flexibility**: Rich template syntax for complex emails
- **Maintainability**: Clear separation of concerns
- **Email Compatibility**: Generated HTML works across email clients

### Negative
- **Complexity**: Multiple libraries to maintain and update
- **Learning Curve**: Users need to learn Handlebars syntax
- **Bundle Size**: Additional dependencies increase application size

### Risks and Mitigations
- **Sanitization Bypass**: Regular security audits and updates
- **Performance Degradation**: Monitoring and optimization
- **Template Complexity**: Documentation and examples
- **Dependency Vulnerabilities**: Automated security scanning

## Future Enhancements
- **MJML Integration**: Professional email layouts
- **Template Marketplace**: Shared template library
- **Advanced Helpers**: Custom Handlebars helpers for common patterns
- **Visual Editor**: WYSIWYG template editor
- **A/B Testing**: Template variant testing

## Success Metrics
- **Security**: Zero XSS vulnerabilities in production
- **Performance**: <100ms template rendering time
- **User Adoption**: >80% of users create custom templates
- **Email Compatibility**: >95% render correctly across clients
