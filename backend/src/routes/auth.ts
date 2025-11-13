import express from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import pool from "../database/connection"
import { EmailService } from "../services/emailService"
import { authenticateToken } from "../middleware/auth"
import { AuthRequest } from "../types"

const router = express.Router()
const emailService = new EmailService()

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Email and password are required" })
    }

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ])

    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" })
    }

    const user = result.rows[0]
    const isValidPassword = await bcrypt.compare(password, user.password_hash)

    if (!isValidPassword) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" })
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: "24h",
    })

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          has_gmail_auth: !!user.gmail_refresh_token,
        },
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ success: false, error: "Internal server error" })
  }
})

// Register (for demo purposes)
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body

    if (!email || !password || !name) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Email, password, and name are required",
        })
    }

    // Check if user already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    )
    if (existingUser.rows.length > 0) {
      return res
        .status(400)
        .json({ success: false, error: "User already exists" })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const result = await pool.query(
      "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name",
      [email, hashedPassword, name]
    )

    const user = result.rows[0]
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: "24h",
    })

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          has_gmail_auth: false,
        },
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({ success: false, error: "Internal server error" })
  }
})

// Get Gmail OAuth URL
router.get(
  "/gmail/auth-url",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const authUrl = emailService.getAuthUrl()
      res.json({ success: true, data: { auth_url: authUrl } })
    } catch (error) {
      console.error("Gmail auth URL error:", error)
      res
        .status(500)
        .json({ success: false, error: "Failed to generate auth URL" })
    }
  }
)

// Gmail OAuth callback
router.post(
  "/gmail/callback",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { code } = req.body

      if (!code) {
        return res
          .status(400)
          .json({ success: false, error: "Authorization code is required" })
      }

      const tokens = await emailService.exchangeCodeForTokens(code)

      // Store tokens in database
      await pool.query(
        "UPDATE users SET gmail_refresh_token = $1, gmail_access_token = $2, gmail_token_expires_at = $3 WHERE id = $4",
        [
          tokens.refresh_token,
          tokens.access_token,
          tokens.expires_at,
          req.user!.id,
        ]
      )

      res.json({ success: true, message: "Gmail authorization successful" })
    } catch (error) {
      console.error("Gmail callback error:", error)
      res
        .status(500)
        .json({
          success: false,
          error: "Failed to process Gmail authorization",
        })
    }
  }
)

// Check Gmail auth status
router.get(
  "/gmail/status",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const result = await pool.query(
        "SELECT gmail_refresh_token IS NOT NULL as has_gmail_auth FROM users WHERE id = $1",
        [req.user!.id]
      )

      res.json({
        success: true,
        data: {
          has_gmail_auth: false,
        },
      })
    } catch (error) {
      console.error("Gmail status error:", error)
      res
        .status(500)
        .json({ success: false, error: "Failed to check Gmail status" })
    }
  }
)

export default router
