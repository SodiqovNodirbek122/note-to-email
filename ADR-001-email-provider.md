# ADR-001: Email Provider Selection and Send-As-User Implementation

## Status
Accepted

## Context
The application requires "send-as-user" functionality where emails appear to come from the user's actual email address, not from an application domain. This is a critical requirement that affects user trust and email deliverability.

## Decision
We will use **Gmail OAuth2 integration with Nodemailer** as the primary email provider for the following reasons:

### Chosen Solution: Gmail OAuth2 + Nodemailer
- **True Send-As-User**: Emails are sent through user's Gmail account with their email in the From field
- **No Domain Setup Required**: No need to configure SPF/DKIM records or verify domains
- **High Deliverability**: Gmail's reputation ensures good inbox placement
- **Cost Effective**: No per-email charges during development and low-volume usage
- **Flexible Architecture**: Can be extended to support multiple providers

### Implementation Details
```javascript
// OAuth2 configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

// Nodemailer transporter with OAuth2
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: user.email,
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET,
    refreshToken: user.gmail_refresh_token,
    accessToken: accessToken,
  },
});
```

## Alternatives Considered

### 1. SendGrid with Verified Sender
**Pros:**
- Professional email service
- Good deliverability
- Detailed analytics

**Cons:**
- Emails come from application domain, not user's email
- Requires domain verification and DNS setup
- Per-email costs
- Not true "send-as-user"

### 2. Mailgun with Custom Domain
**Pros:**
- Reliable delivery
- Good API
- Event webhooks

**Cons:**
- Same domain limitation as SendGrid
- Complex setup for multiple users
- Ongoing costs

### 3. AWS SES
**Pros:**
- Cost effective at scale
- Good integration with AWS ecosystem

**Cons:**
- Complex setup
- Domain verification required
- Not send-as-user without complex configuration

### 4. Custom SMTP with User Credentials
**Pros:**
- True send-as-user
- Works with any email provider

**Cons:**
- Security risk storing user passwords
- No OAuth support for most providers
- Complex configuration per provider

## Send-As-User Implications

### Security Considerations
- **OAuth Scopes**: Request minimal scopes (`gmail.send` only)
- **Token Storage**: Securely store refresh tokens encrypted
- **Token Refresh**: Automatic refresh of expired access tokens
- **Revocation**: Handle token revocation gracefully

### User Experience
- **Authorization Flow**: Clear explanation of permissions requested
- **Status Indication**: Show Gmail connection status in UI
- **Error Handling**: Graceful handling of authorization failures

### Technical Implementation
```javascript
// Required OAuth scopes
const scopes = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email'
];

// Token refresh logic
private async refreshAccessToken(user: User): Promise<string> {
  this.oauth2Client.setCredentials({
    refresh_token: user.gmail_refresh_token
  });
  
  const { credentials } = await this.oauth2Client.refreshAccessToken();
  
  // Update database with new token
  await this.updateUserTokens(user.id, credentials);
  
  return credentials.access_token;
}
```

## Consequences

### Positive
- **Authentic Emails**: Recipients see emails from user's actual address
- **High Deliverability**: Gmail's reputation ensures good delivery rates
- **User Trust**: No "sent on behalf of" warnings
- **Cost Effective**: No per-email charges for low-volume usage
- **Extensible**: Architecture supports adding other OAuth providers

### Negative
- **OAuth Complexity**: More complex than API key-based solutions
- **User Friction**: Requires additional authorization step
- **Provider Dependency**: Tied to Gmail's OAuth policies
- **Rate Limits**: Subject to Gmail's sending limits per user

### Risks and Mitigations
- **Token Revocation**: Implement graceful handling and re-authorization flow
- **Rate Limiting**: Implement application-level rate limiting
- **Scope Creep**: Strictly limit OAuth scopes to minimum required
- **Provider Changes**: Monitor Gmail API changes and deprecations

## Future Considerations
- **Multi-Provider Support**: Add Outlook/Office 365 OAuth support
- **Fallback Options**: Implement fallback to application-domain sending
- **Enterprise Features**: Support for G Suite/Workspace domain policies
- **Advanced Permissions**: Support for delegate/shared mailbox access

## Implementation Timeline
1. **Phase 1**: Basic Gmail OAuth integration
2. **Phase 2**: Token refresh and error handling
3. **Phase 3**: UI for authorization management
4. **Phase 4**: Multi-provider architecture preparation

## Success Metrics
- **Authorization Success Rate**: >95% of users successfully authorize Gmail
- **Email Delivery Rate**: >98% of emails successfully sent
- **Token Refresh Success**: >99% of token refreshes succeed
- **User Satisfaction**: Positive feedback on email authenticity
