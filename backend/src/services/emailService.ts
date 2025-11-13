import nodemailer from "nodemailer"
import { google } from "googleapis"
import { User, SentEmail } from "../types"
import pool from "../database/connection"

export class EmailService {
  private oauth2Client: any

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    )
  }

  public getAuthUrl(): string {
    const scopes = [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/userinfo.email",
    ]

    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
    })
  }

  public async exchangeCodeForTokens(
    code: string
  ): Promise<{
    access_token: string
    refresh_token: string
    expires_at: Date
  }> {
    const { tokens } = await this.oauth2Client.getToken(code)

    const expiresAt = new Date()
    if (tokens.expiry_date) {
      expiresAt.setTime(tokens.expiry_date)
    } else {
      expiresAt.setSeconds(expiresAt.getSeconds() + 3600)
    }

    return {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token!,
      expires_at: expiresAt,
    }
  }

 
  private async refreshAccessToken(user: User): Promise<string> {
    if (!user.gmail_refresh_token) {
      throw new Error("No refresh token available")
    }

    this.oauth2Client.setCredentials({
      refresh_token: user.gmail_refresh_token,
    })

    const { credentials } = await this.oauth2Client.refreshAccessToken()

    // Update user's access token in database
    const expiresAt = new Date()
    expiresAt.setSeconds(
      expiresAt.getSeconds() + (credentials.expiry_date || 3600)
    )

    await pool.query(
      "UPDATE users SET gmail_access_token = $1, gmail_token_expires_at = $2 WHERE id = $3",
      [credentials.access_token, expiresAt, user.id]
    )

    return credentials.access_token
  }

  /**
   * Get valid access token for user
   */
  private async getValidAccessToken(user: User): Promise<string> {
    // Check if current token is still valid
    if (user.gmail_access_token && user.gmail_token_expires_at) {
      const now = new Date()
      const expiresAt = new Date(user.gmail_token_expires_at)

      // If token expires in more than 5 minutes, use it
      if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
        return user.gmail_access_token
      }
    }

    // Token is expired or about to expire, refresh it
    return await this.refreshAccessToken(user)
  }

  /**
   * Create nodemailer transporter with OAuth2
   */
  private async createTransporter(user: User): Promise<nodemailer.Transporter> {
    const accessToken = await this.getValidAccessToken(user)

    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: user.email,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: user.gmail_refresh_token,
        accessToken: accessToken,
      },
    })
  }

  /**
   * Send email using user's Gmail account
   */
  public async sendEmail(
    user: User,
    recipients: string[],
    subject: string,
    htmlBody: string,
    textBody?: string
  ): Promise<{ messageId: string; success: boolean; error?: string }> {
    try {
      if (!user.gmail_refresh_token) {
        throw new Error("User has not authorized Gmail access")
      }

      const transporter = await this.createTransporter(user)

      const mailOptions = {
        from: user.email, // Send as the user
        to: recipients.join(", "),
        subject: subject,
        html: htmlBody,
        text: textBody || this.htmlToText(htmlBody),
      }

      const result = await transporter.sendMail(mailOptions)

      return {
        messageId: result.messageId,
        success: true,
      }
    } catch (error) {
      console.error("Email sending error:", error)
      return {
        messageId: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * Simple HTML to text conversion
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n\s*\n\s*\n/g, "\n\n")
      .trim()
  }

  /**
   * Update sent email status in database
   */
  public async updateSentEmailStatus(
    sentEmailId: string,
    status: "sent" | "failed",
    providerMessageId?: string,
    errorMessage?: string
  ): Promise<void> {
    const sentAt = status === "sent" ? new Date() : null

    await pool.query(
      `UPDATE sent_emails 
       SET status = $1, provider_message_id = $2, error_message = $3, sent_at = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [status, providerMessageId, errorMessage, sentAt, sentEmailId]
    )
  }
}
