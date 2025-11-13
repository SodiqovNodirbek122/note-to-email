import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EmailTemplate } from '../types/index.ts';
import { apiService } from '../services/api.ts';

const TemplateEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = id !== 'new';

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditing && id) {
      loadTemplate(id);
    }
  }, [id, isEditing]);

  const loadTemplate = async (templateId: string) => {
    try {
      setLoading(true);
      const response = await apiService.getTemplate(templateId);
      if (response.success && response.data) {
        setName(response.data.name);
        setSubject(response.data.subject);
        setBody(response.data.body);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || !body.trim()) {
      setError('Name, subject, and body are required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (isEditing && id) {
        await apiService.updateTemplate(id, name, subject, body);
      } else {
        await apiService.createTemplate(name, subject, body);
      }

      navigate('/templates');
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/templates');
  };

  if (loading && isEditing) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            {isEditing ? 'Edit Template' : 'Create Template'}
          </h2>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Template Name
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="name"
              id="name"
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="Enter template name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
            Email Subject
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="subject"
              id="subject"
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="Enter email subject (supports Handlebars variables)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Use {'{'}{'{'} note_title {'}'}{'}'}  or other variables
          </p>
        </div>

        <div>
          <label htmlFor="body" className="block text-sm font-medium text-gray-700">
            Email Body (HTML Template)
          </label>
          <div className="mt-1">
            <textarea
              id="body"
              name="body"
              rows={20}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md font-mono"
              placeholder="Enter your email template using HTML and Handlebars syntax..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
          </div>
          <div className="mt-2 text-sm text-gray-500">
            <p className="mb-2">Available variables:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><code className="bg-gray-100 px-1 rounded">{'{{note_title}}'}</code> - Note title</li>
              <li><code className="bg-gray-100 px-1 rounded">{'{{note_content}}'}</code> - Raw note content</li>
              <li><code className="bg-gray-100 px-1 rounded">{'{{note_content_html}}'}</code> - Note content as HTML</li>
              <li><code className="bg-gray-100 px-1 rounded">{'{{today}}'}</code> - Today's date</li>
              <li><code className="bg-gray-100 px-1 rounded">{'{{current_year}}'}</code> - Current year</li>
            </ul>
            <p className="mt-2">Use HTML tags for formatting. Content will be sanitized for security.</p>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-md">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Example Template:</h4>
          <pre className="text-xs text-gray-600 whitespace-pre-wrap">
{`<h2>{{note_title}}</h2>
<p>Hi there,</p>
<p>I wanted to share this note with you:</p>
<div style="border-left: 4px solid #3B82F6; padding-left: 16px; margin: 16px 0;">
  {{{note_content_html}}}
</div>
<p>Best regards,<br>Your Name</p>
<p><small>Sent on {{today}}</small></p>`}
          </pre>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleCancel}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : isEditing ? 'Update Template' : 'Create Template'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TemplateEditor;
