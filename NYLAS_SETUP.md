# Nylas Email Integration Setup

This guide explains how to set up Nylas for email sending instead of Gmail OAuth.

## Why Nylas?

Nylas provides a unified API for email providers (Gmail, Outlook, Yahoo, etc.) with:
- Simpler OAuth flow
- Better reliability
- Support for multiple email providers
- Professional email management features

## Setup Steps

### 1. Create Nylas Account
1. Go to [Nylas Developer Console](https://developer.nylas.com/)
2. Sign up for a free account
3. Create a new application

### 2. Get API Credentials
From your Nylas dashboard, get:
- **API Key** (for server-side operations)
- **Client ID** (for OAuth)
- **Client Secret** (for OAuth)

### 3. Configure Environment Variables
Add these to your `.env` file:

```env
# Nylas Configuration
NYLAS_API_KEY=your-nylas-api-key
NYLAS_CLIENT_ID=your-nylas-client-id
NYLAS_CLIENT_SECRET=your-nylas-client-secret
NYLAS_REDIRECT_URI=http://localhost:3001/auth/nylas/callback
NYLAS_API_URI=https://api.us.nylas.com
```

### 4. Configure OAuth Redirect URI
In your Nylas app settings, add the redirect URI:
```
http://localhost:3001/auth/nylas/callback
```

### 5. Database Migration
The database has been updated to support Nylas tokens:
```sql
ALTER TABLE users ADD COLUMN nylas_access_token TEXT;
ALTER TABLE users ADD COLUMN nylas_account_id VARCHAR(255);
ALTER TABLE users ADD COLUMN has_nylas_auth BOOLEAN DEFAULT FALSE;
```

## API Endpoints

### Authentication
- `GET /api/auth/nylas/auth-url` - Get OAuth URL
- `POST /api/auth/nylas/callback` - Handle OAuth callback
- `GET /api/auth/nylas/status` - Check auth status
- `POST /api/auth/nylas/revoke` - Revoke authorization

### Email Sending
The existing `/api/emails/send` endpoint now supports both Gmail and Nylas.
Priority: Nylas > Gmail > Fallback

## Frontend Integration

The frontend has been updated with Nylas support:
- New auth methods in `apiService`
- Updated compose page to handle Nylas auth
- Fallback to Gmail if Nylas is not configured

## Usage Flow

1. User clicks "Authorize Email" in compose page
2. System checks for Nylas configuration
3. If Nylas is configured, redirects to Nylas OAuth
4. If not, falls back to Gmail OAuth
5. After authorization, user can send emails

## Benefits Over Gmail OAuth

1. **Multi-Provider Support**: Works with Gmail, Outlook, Yahoo, etc.
2. **Simpler Setup**: Less complex than Gmail OAuth
3. **Better Reliability**: Professional-grade email API
4. **Advanced Features**: Email tracking, scheduling, etc.
5. **Unified Interface**: Same API for all email providers

## Testing

1. Set up Nylas credentials in `.env`
2. Start the backend server
3. Go to compose page
4. Click "Authorize Email"
5. Complete Nylas OAuth flow
6. Send test email

## Production Considerations

1. **Rate Limits**: Nylas has generous rate limits
2. **Security**: Store API keys securely
3. **Monitoring**: Use Nylas dashboard for monitoring
4. **Webhooks**: Set up webhooks for email events
5. **Scaling**: Nylas handles scaling automatically

## Troubleshooting

### Common Issues:
1. **Invalid API Key**: Check your Nylas dashboard
2. **Redirect URI Mismatch**: Ensure URIs match exactly
3. **Scope Issues**: Verify required scopes are granted
4. **Token Expiry**: Implement token refresh logic

### Debug Mode:
Set `NODE_ENV=development` for detailed error logs.

## Migration from Gmail

If migrating from Gmail OAuth:
1. Keep existing Gmail code for backward compatibility
2. Add Nylas as primary method
3. Gradually migrate users to Nylas
4. Eventually deprecate Gmail OAuth

## Support

- [Nylas Documentation](https://developer.nylas.com/docs/)
- [Nylas API Reference](https://developer.nylas.com/docs/api/)
- [Nylas Community](https://community.nylas.com/)
