import express from "express"
import cors from "cors"
import helmet from "helmet"
import dotenv from "dotenv"
import { generalLimiter } from "./middleware/rateLimiter"

// Import routes
import authRoutes from "./routes/auth"
import nylasAuthRoutes from "./routes/nylasAuth"
import notesRoutes from "./routes/notes"
import templatesRoutes from "./routes/templates"
import emailsRoutes from "./routes/emails"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(helmet())
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://note-to-email.vercel.app"]
        : ["http://localhost:3000", "http://localhost:3002"],
    credentials: true,
  })
)
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))
app.use(generalLimiter)

// Health check
app.get("/health", (req, res) => {
  res.json({ success: true, message: "Server is running" })
})

// Gmail OAuth callback route (direct route to match Google OAuth redirect URI)
app.get("/auth/gmail/callback", (req, res) => {
  // For GET requests (OAuth callback), redirect to frontend with code
  const { code, error } = req.query

  if (error) {
    return res.redirect(
      `${process.env.FRONTEND_URL}/auth/error?error=${encodeURIComponent(
        error as string
      )}`
    )
  }

  if (code) {
    // Redirect to frontend with the authorization code
    return res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?code=${encodeURIComponent(
        code as string
      )}`
    )
  }

  res.status(400).json({ success: false, error: "Missing authorization code" })
})

// Nylas OAuth callback route (direct route to match Nylas OAuth redirect URI)
app.get("/auth/nylas/callback", (req, res) => {
  // For GET requests (OAuth callback), redirect to frontend with code and state
  const { code, error, state } = req.query

  if (error) {
    return res.redirect(
      `${process.env.FRONTEND_URL}/auth/error?error=${encodeURIComponent(
        error as string
      )}`
    )
  }

  if (code) {
    // Redirect to frontend with the authorization code and state (user email)
    return res.redirect(
      `${
        process.env.FRONTEND_URL
      }/auth/nylas/callback?code=${encodeURIComponent(
        code as string
      )}&state=${encodeURIComponent(state as string)}`
    )
  }

  res.status(400).json({ success: false, error: "Missing authorization code" })
})

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/auth", nylasAuthRoutes)
app.use("/api/notes", notesRoutes)
app.use("/api/templates", templatesRoutes)
app.use("/api/emails", emailsRoutes)

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err)
    res.status(500).json({
      success: false,
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : err.message,
    })
  }
)

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`)
})
