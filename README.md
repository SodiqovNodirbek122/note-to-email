# Notes to Email Application

A full-stack application that allows users to convert their notes into professional emails using customizable templates. Built with Node.js, Express, TypeScript, PostgreSQL, React, and Gmail OAuth integration.

## Features

- **Notes Management**: Create, edit, and manage notes in Markdown format
- **Email Templates**: Create reusable email templates with Handlebars syntax
- **Template Engine**: Merge note data into templates with HTML sanitization
- **Send-As-User**: Send emails through user's Gmail account using OAuth2
- **Idempotency**: Prevent duplicate email sends with idempotency keys
- **Template Versioning**: Track which template version was used for sent emails
- **Rate Limiting**: Protect against abuse with configurable rate limits

## Tech Stack

### Backend
- Node.js + Express + TypeScript
- PostgreSQL with connection pooling
- Gmail OAuth2 integration via Google APIs
- Handlebars template engine
- DOMPurify for HTML sanitization
- JWT authentication
- Rate limiting with express-rate-limit

### Frontend
- React + TypeScript
- Tailwind CSS for styling
- React Router for navigation
- Context API for state management

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Gmail account for OAuth setup

### 1. Database Setup
```bash
# Create database
createdb notes_email_db

# Run schema
psql notes_email_db < backend/src/database/schema.sql
```

### 2. Gmail OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Gmail API
4. Create OAuth 2.0 credentials
5. Add `http://localhost:3001/auth/gmail/callback` to authorized redirect URIs

### 3. Backend Setup
```bash
cd backend
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your values:
# - DATABASE_URL
# - JWT_SECRET
# - GMAIL_CLIENT_ID
# - GMAIL_CLIENT_SECRET

# Start development server
npm run dev
```

### 4. Frontend Setup
```bash
cd frontend
npm install

# Start development server
npm start
```

### 5. Access Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Demo login: `demo@example.com` / `password`

## Usage

1. **Login** with demo credentials or create account
2. **Authorize Gmail** access for send-as-user functionality
3. **Create Notes** in Markdown format
4. **Create Templates** using Handlebars syntax
5. **Compose Emails** by selecting note + template
6. **Preview** rendered email before sending
7. **Send** email through your Gmail account

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/gmail/auth-url` - Get Gmail OAuth URL
- `POST /api/auth/gmail/callback` - Handle OAuth callback

### Notes
- `GET /api/notes` - List user's notes
- `POST /api/notes` - Create note
- `GET /api/notes/:id` - Get note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note

### Templates
- `GET /api/templates` - List user's templates
- `POST /api/templates` - Create template
- `GET /api/templates/:id` - Get template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template
- `POST /api/templates/:templateId/preview/:noteId` - Preview merged email

### Emails
- `POST /api/emails/send` - Send email
- `GET /api/emails/sent` - List sent emails
- `GET /api/emails/sent/:id` - Get sent email details
- `POST /api/emails/sent/:id/retry` - Retry failed email

## Template Variables

Available variables in email templates:
- `{{note_title}}` - Note title
- `{{note_content}}` - Raw note content (Markdown)
- `{{note_content_html}}` - Note content rendered as HTML
- `{{note_created_at}}` - Note creation timestamp
- `{{note_updated_at}}` - Note update timestamp
- `{{today}}` - Current date (YYYY-MM-DD)
- `{{now}}` - Current timestamp (ISO)
- `{{current_year}}` - Current year
- `{{current_month}}` - Current month name
- `{{current_date}}` - Current date (localized)

## Security Features

- JWT-based authentication
- HTML sanitization with DOMPurify
- Rate limiting on email endpoints
- OAuth2 for secure email sending
- SQL injection prevention with parameterized queries
- XSS protection with Content Security Policy headers

## Development

### Running Tests
```bash
cd backend
npm test
```

### Building for Production
```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

### Environment Variables

#### Backend (.env)
```env
DATABASE_URL=postgresql://username:password@localhost:5432/notes_email_db
JWT_SECRET=your-super-secret-jwt-key
PORT=3001
NODE_ENV=development
GMAIL_CLIENT_ID=your-gmail-oauth-client-id
GMAIL_CLIENT_SECRET=your-gmail-oauth-client-secret
GMAIL_REDIRECT_URI=http://localhost:3001/auth/gmail/callback
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=10
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:3001/api
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design and architecture decisions.

## ADRs (Architecture Decision Records)

- [ADR-001: Email Provider Selection](./ADR-001-email-provider.md)
- [ADR-002: Template Engine and Sanitization](./ADR-002-template-engine.md)

## Demo User

The application includes a demo user for testing:
- **Email**: demo@example.com
- **Password**: password

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## License

MIT License - see LICENSE file for details.
