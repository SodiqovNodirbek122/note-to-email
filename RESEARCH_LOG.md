# Research Log

## Email Service Providers Research

### 1. JavaScript Email Frameworks Comparison
**Link**: https://dev.to/scofieldidehen/4-javascript-email-frameworks-nodemailer-sendgrid-smtpjs-and-mailgun-3eal

**Key Takeaways**:
- **Nodemailer**: Open-source, flexible, supports multiple transports (SMTP, sendmail), good for custom implementations but requires more setup
- **SendGrid**: Commercial service with excellent deliverability, dynamic content, templates, analytics - good for production but costs money
- **Mailgun**: Strong deliverability, event webhooks, email validation, good API - reliable commercial option
- **SMTP.js**: Simple client-side solution but limited for server applications

**Design Influence**: This comparison helped me understand that for a "send-as-user" feature, I need OAuth-based authentication rather than API keys. Nodemailer with OAuth2 transport will be most flexible for implementing custom "send-as" functionality.

### 2. OAuth Authentication for Email Protocols
**Link**: https://learn.microsoft.com/en-us/exchange/client-developer/legacy-protocols/how-to-authenticate-an-imap-pop-smtp-application-by-using-oauth

**Key Takeaways**:
- OAuth2 XOAUTH2 mechanism allows applications to send emails on behalf of users
- Requires proper OAuth flow with appropriate scopes (Mail.Send for Microsoft, gmail.send for Google)
- SMTP authentication uses base64-encoded XOAUTH2 format with access tokens
- Shared mailbox access requires replacing userName field with target email address

**Design Influence**: This research confirmed that true "send-as-user" functionality requires OAuth integration with email providers. I'll implement Nodemailer with OAuth2 transport for Gmail initially, with architecture that can support multiple providers.

## Provider Decision Rationale

Based on research, I'm choosing **Nodemailer with Gmail OAuth2** for the initial implementation because:

1. **True Send-As-User**: OAuth2 allows sending with user's actual email address in From field
2. **Flexibility**: Nodemailer supports multiple transports and can be extended to other providers
3. **Cost**: No per-email costs during development/demo phase
4. **Documentation**: Well-documented OAuth2 integration patterns
5. **Scalability**: Can add other providers (Outlook, custom SMTP) using same architecture

Alternative considered: SendGrid/Mailgun with verified sender domains, but this doesn't provide true "send-as-user" functionality - emails would come from app domain, not user's personal email.
