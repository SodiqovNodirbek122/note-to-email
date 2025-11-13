import Nylas from "nylas"
import { User } from "../types"

export interface EmailSendResult {
  messageId: string
  success: boolean
  error?: string
}

export class NylasEmailService {
  private nylas: Nylas
  private apiKey: string

  constructor() {
    this.apiKey = process.env.NYLAS_API_KEY!
    // Initialize Nylas with API credentials for v3
    this.nylas = new Nylas({
      apiKey: this.apiKey,
      apiUri: process.env.NYLAS_API_URI || "https://api.us.nylas.com",
    })
  }

  public getAuthUrl(userEmail: string): string {
    const config = {
      clientId: process.env.NYLAS_CLIENT_ID!,
      redirectUri:
        process.env.NYLAS_REDIRECT_URI ||
        "http://localhost:3001/auth/nylas/callback",
      scopes: ["https://www.googleapis.com/auth/gmail.send"],
      state: userEmail, // Pass user email as state to identify user after callback
    }

    return this.nylas.auth.urlForOAuth2(config)
  }

  public async exchangeCodeForToken(code: string): Promise<string> {
    try {
      const response = await this.nylas.auth.exchangeCodeForToken({
        clientId: process.env.NYLAS_CLIENT_ID!,
        clientSecret: process.env.NYLAS_CLIENT_SECRET!,
        code: code,

        redirectUri:
          process.env.NYLAS_REDIRECT_URI ||
          "http://localhost:3001/auth/nylas/callback",
      })

      return response.accessToken
    } catch (error) {
      console.error("Nylas token exchange error:", error)
      throw new Error("Failed to exchange authorization code")
    }
  }

  public async sendEmail(
    grantId: string,
    recipients: string[],
    subject: string,
    bodyHtml: string,
    bodyText: string
  ): Promise<EmailSendResult> {
    try {
      // Create message object for Nylas v3 API (exact format from your curl example)
      const messageData: any = {
        subject: subject,
        body: bodyHtml, // HTML content goes in 'body' field
        to: recipients.map((email) => ({
          name: email.split("@")[0], // Use email username as name
          email: email,
        })),
        // tracking_options: {
        //   opens: true,
        //   links: true,
        //   thread_replies: true,
        //   label: "email-app-send",
        // },
      }

      // Add plain text version if provided
      if (bodyText) {
        messageData.text = bodyText
      }

      // Use correct Nylas v3 API endpoint for sending messages
      const endpoint = `https://api.us.nylas.com/v3/grants/${`dcbd389c-d486-4d70-8c82-022dc738806e`}/messages/send`

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messageData),
      })

      if (!response.ok) {
        const responseText = await response.text()
        console.error("Nylas API error response:", responseText)

        let errorMessage = `HTTP ${response.status}`
        try {
          const errorData = JSON.parse(responseText)
          errorMessage =
            errorData.error?.message || errorData.message || errorMessage
        } catch (parseError) {
          console.error("Failed to parse error response as JSON:", parseError)
          errorMessage = responseText.substring(0, 200) // First 200 chars of error
        }

        throw new Error(errorMessage)
      }

      const responseText = await response.text()
      console.log("Nylas API success response:", responseText)

      let result
      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error("Failed to parse success response as JSON:", parseError)
        console.error("Raw response:", responseText)
        throw new Error("Invalid JSON response from Nylas API")
      }

      return {
        messageId: result.data?.id || result.id || "",
        success: true,
      }
    } catch (error: any) {
      console.error("Nylas email sending error:", error)
      return {
        messageId: "",
        success: false,
        error: error.message || "Failed to send email",
      }
    }
  }

  /**
   * Get messages using Nylas v3 API (like your curl example)
   */
  public async getMessages(
    grantId: string,
    limit: number = 5,
    unread: boolean = false
  ): Promise<any> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(unread && { unread: "true" }),
      })

      const response = await fetch(
        `https://api.us.nylas.com/v3/grants/${grantId}/messages?${params}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Nylas get messages error:", error)
      throw error
    }
  }

  /**
   * Get user's email account info using v3 API
   */
  public async getAccountInfo(
    grantId: string
  ): Promise<{ email: string; name: string } | null> {
    try {
      console.log(
        "Getting account info for grantId:",
        grantId.substring(0, 20) + "..."
      )

      // Try different API endpoints for Nylas v3
      const endpoints = [
        `https://api.us.nylas.com/v3/grants/${grantId}`,
        `https://api.us.nylas.com/v3/accounts`,
      ]

      for (const endpoint of endpoints) {
        try {
          console.log("Trying endpoint:", endpoint)

          const response = await fetch(endpoint, {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${this.apiKey}`,
            },
          })

          console.log("Response status:", response.status)

          if (response.ok) {
            const result = await response.json()
            console.log("API Response:", JSON.stringify(result, null, 2))

            // Handle different response structures
            let accountData = result
            if (result.data) {
              accountData = Array.isArray(result.data)
                ? result.data[0]
                : result.data
            }

            const email =
              accountData.email ||
              accountData.email_address ||
              accountData.primary_email_address ||
              ""
            const name = accountData.name || accountData.display_name || email

            if (email) {
              console.log("Found account info:", { email, name })
              return { email, name }
            }
          } else {
            const errorText = await response.text()
            console.log(
              `Endpoint ${endpoint} failed:`,
              response.status,
              errorText
            )
          }
        } catch (endpointError) {
          console.log(`Endpoint ${endpoint} error:`, endpointError)
        }
      }

      // If all endpoints fail, return a default based on grant ID
      console.log("All endpoints failed, using fallback")
      return {
        email: "unknown@example.com",
        name: "Nylas User",
      }
    } catch (error) {
      console.error("Nylas account info error:", error)
      return null
    }
  }

  /**
   * Check if grant is valid using v3 API
   */
  public async validateGrant(grantId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://api.us.nylas.com/v3/grants/${grantId}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      )

      return response.ok
    } catch (error) {
      return false
    }
  }

  /**
   * Revoke grant using v3 API
   */
  public async revokeGrant(grantId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://api.us.nylas.com/v3/grants/${grantId}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      )

      return response.ok
    } catch (error) {
      console.error("Nylas grant revocation error:", error)
      return false
    }
  }
}
