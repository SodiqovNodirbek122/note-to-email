import express from "express"
import pool from "../database/connection"
import { NylasEmailService } from "../services/nylasEmailService"
import { authenticateToken } from "../middleware/auth"
import { AuthRequest } from "../types"

const router = express.Router()
const nylasService = new NylasEmailService()

// Get Nylas OAuth URL
router.get(
  "/nylas/auth-url",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const user = req.user!
      const authUrl = nylasService.getAuthUrl(user.email)

      res.json({
        success: true,
        data: { auth_url: authUrl },
      })
    } catch (error: any) {
      console.error("Nylas auth URL error:", error)
      res.status(500).json({
        success: false,
        error: "Failed to generate authorization URL",
      })
    }
  }
)

// Handle Nylas OAuth callback
router.post(
  "/nylas/callback",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { code } = req.body
      const user = req.user!

      if (!code) {
        return res.status(400).json({
          success: false,
          error: "Authorization code is required",
        })
      }

      // Exchange code for access token
      const accessToken = await nylasService.exchangeCodeForToken(code)

      // Get account info
      const accountInfo = await nylasService.getAccountInfo(accessToken)

      if (!accountInfo) {
        return res.status(400).json({
          success: false,
          error: "Failed to get account information",
        })
      }

      // Store Nylas credentials in database
      await pool.query(
        `UPDATE users 
       SET nylas_access_token = $1, 
           nylas_account_id = $2, 
           has_nylas_auth = true,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
        [accessToken, accountInfo.email, user.id]
      )

      res.json({
        success: true,
        data: {
          message: "Nylas authorization successful",
          account_email: accountInfo.email,
        },
      })
    } catch (error: any) {
      console.error("Nylas callback error:", error)
      res.status(500).json({
        success: false,
        error: "Failed to complete Nylas authorization",
      })
    }
  }
)

// Get Nylas authorization status
router.get(
  "/nylas/status",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const user = req.user!

      // Check if user has Nylas auth
      const result = await pool.query(
        "SELECT has_nylas_auth, nylas_account_id FROM users WHERE id = $1",
        [user.id]
      )

      const userData = result.rows[0]

      res.json({
        success: true,
        data: {
          has_nylas_auth: userData?.has_nylas_auth || false,
          account_email: userData?.nylas_account_id || null,
        },
      })
    } catch (error: any) {
      console.error("Nylas status error:", error)
      res.status(500).json({
        success: false,
        error: "Failed to get Nylas status",
      })
    }
  }
)

// Revoke Nylas authorization
router.post(
  "/nylas/revoke",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const user = req.user!

      // Get user's Nylas token
      const result = await pool.query(
        "SELECT nylas_access_token FROM users WHERE id = $1",
        [user.id]
      )

      const userData = result.rows[0]

      if (userData?.nylas_access_token) {
        // Revoke the grant
        await nylasService.revokeGrant(userData.nylas_access_token)
      }

      // Remove Nylas credentials from database
      await pool.query(
        `UPDATE users 
       SET nylas_access_token = NULL, 
           nylas_account_id = NULL, 
           has_nylas_auth = false,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
        [user.id]
      )

      res.json({
        success: true,
        data: { message: "Nylas authorization revoked" },
      })
    } catch (error: any) {
      console.error("Nylas revoke error:", error)
      res.status(500).json({
        success: false,
        error: "Failed to revoke Nylas authorization",
      })
    }
  }
)

export default router
