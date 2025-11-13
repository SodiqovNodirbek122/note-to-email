import React, { useState, useEffect } from "react"
import { Note, EmailTemplate, EmailPreview } from "../types/index.ts"
import { apiService } from "../services/api.ts"
import { useAuth } from "../contexts/AuthContext.tsx"

const ComposePage: React.FC = () => {
  const { user } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedNote, setSelectedNote] = useState<string>("")
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [recipients, setRecipients] = useState<string>("")
  const [preview, setPreview] = useState<EmailPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [needsGmailAuth, setNeedsGmailAuth] = useState(false)
  const [needsNylasAuth, setNeedsNylasAuth] = useState(false)

  useEffect(() => {
    loadData()
    checkGmailAuth()
    checkNylasAuth()
  }, [])

  const loadData = async () => {
    try {
      const [notesResponse, templatesResponse] = await Promise.all([
        apiService.getNotes(),
        apiService.getTemplates(),
      ])

      if (notesResponse.success && notesResponse.data) {
        setNotes(notesResponse.data)
      }
      if (templatesResponse.success && templatesResponse.data) {
        setTemplates(templatesResponse.data)
      }
    } catch (err: any) {
      setError("Failed to load data")
    }
  }

  const checkGmailAuth = async () => {
    try {
      const response = await apiService.getGmailStatus()
      if (response.success && response.data) {
        setNeedsGmailAuth(!response.data.has_gmail_auth)
      }
    } catch (err) {
      console.error("Failed to check Gmail auth status")
    }
  }

  const checkNylasAuth = async () => {
    try {
      const response = await apiService.getNylasStatus()
      if (response.success && response.data) {
        setNeedsNylasAuth(!response.data.has_nylas_auth)
      }
    } catch (err) {
      console.error("Failed to check Nylas auth status")
    }
  }

  const handlePreview = async () => {
    if (!selectedNote || !selectedTemplate) {
      setError("Please select both a note and a template")
      return
    }

    try {
      setLoading(true)
      setError("")
      const response = await apiService.previewTemplate(
        selectedTemplate,
        selectedNote
      )
      if (response.success && response.data) {
        setPreview(response.data)
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate preview")
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!selectedNote || !selectedTemplate || !recipients.trim()) {
      setError("Please select note, template, and enter recipients")
      return
    }

    // Check if any email service is authorized
    if (needsGmailAuth && needsNylasAuth) {
      setError('Please authorize Nylas or Gmail access first');
      return;
    }

    const recipientList = recipients
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email.length > 0)

    if (recipientList.length === 0) {
      setError("Please enter valid email addresses")
      return
    }

    try {
      setSending(true)
      setError("")
      setSuccess("")

      const response = await apiService.sendEmail(
        selectedNote,
        selectedTemplate,
        recipientList
      )

      if (response.success && response.data) {
        const serviceUsed = !needsNylasAuth ? "Nylas" : "Gmail";
        setSuccess(
          `Email sent successfully via ${serviceUsed}! Message ID: ${response.data.message_id}`
        )
        setRecipients("")
        setPreview(null)
      }
    } catch (err: any) {
      setError(err.message || "Failed to send email")
    } finally {
      setSending(false)
    }
  }

  const handleGmailAuth = async () => {
    try {
      const response = await apiService.getGmailAuthUrl()
      if (response.success && response.data) {
        window.open(response.data.auth_url, "_blank")
        // Note: In a real app, you'd handle the OAuth callback properly
        alert("Please complete the Gmail authorization and refresh this page")
      }
    } catch (err: any) {
      setError("Failed to get Gmail authorization URL")
    }
  }

  const handleNylasAuth = async () => {
    try {
      const response = await apiService.getNylasAuthUrl()
      if (response.success && response.data) {
        window.open(response.data.auth_url, "_blank")
        alert("Please complete the Nylas authorization and refresh this page")
      }
    } catch (err: any) {
      setError("Failed to get Nylas authorization URL")
    }
  }

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Compose Email
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Select a note and template to compose and send an email
          </p>
        </div>
      </div>

      {(needsGmailAuth && needsNylasAuth) && (
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Email Authorization Required
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  You need to authorize email access to send emails. Choose your
                  preferred provider:
                </p>
              </div>
              <div className="mt-4 space-x-3">
                <button
                  onClick={handleNylasAuth}
                  className="bg-blue-100 px-3 py-2 rounded-md text-sm font-medium text-blue-800 hover:bg-blue-200"
                >
                  Authorize Nylas (Recommended)
                </button>
                <button
                  onClick={handleGmailAuth}
                  className="bg-yellow-100 px-3 py-2 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-200"
                >
                  Authorize Gmail
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Service Status */}
      {(!needsGmailAuth || !needsNylasAuth) && (
        <div className="rounded-md bg-green-50 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Email Service Connected
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  {!needsNylasAuth && "✅ Nylas authorized"}
                  {!needsNylasAuth && !needsGmailAuth && " • "}
                  {!needsGmailAuth && "✅ Gmail authorized"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Selection Panel */}
        <div className="space-y-6">
          <div>
            <label
              htmlFor="note"
              className="block text-sm font-medium text-gray-700"
            >
              Select Note
            </label>
            <select
              id="note"
              name="note"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={selectedNote}
              onChange={(e) => setSelectedNote(e.target.value)}
            >
              <option value="">Choose a note...</option>
              {notes.map((note) => (
                <option key={note.id} value={note.id}>
                  {note.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="template"
              className="block text-sm font-medium text-gray-700"
            >
              Select Template
            </label>
            <select
              id="template"
              name="template"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
            >
              <option value="">Choose a template...</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="recipients"
              className="block text-sm font-medium text-gray-700"
            >
              Recipients
            </label>
            <textarea
              id="recipients"
              name="recipients"
              rows={3}
              className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="Enter email addresses separated by commas"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
            />
            <p className="mt-1 text-sm text-gray-500">
              Separate multiple email addresses with commas
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handlePreview}
              disabled={loading || !selectedNote || !selectedTemplate}
              className="flex-1 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? "Generating..." : "Preview"}
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !preview || !recipients.trim() || (needsGmailAuth && needsNylasAuth)}
              className="flex-1 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send Email"}
            </button>
          </div>
        </div>

        {/* Preview Panel */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Preview</h3>
          {preview ? (
            <div className="border border-gray-300 rounded-md">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-300">
                <div className="text-sm">
                  <strong>From:</strong> {user?.email}
                </div>
                <div className="text-sm mt-1">
                  <strong>Subject:</strong> {preview.subject}
                </div>
              </div>
              <div className="p-4">
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: preview.body_html }}
                />
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-md p-12 text-center">
              <p className="text-gray-500">
                Select a note and template, then click Preview to see the email
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ComposePage
