import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SentEmail } from '../types/index.ts';
import { apiService } from '../services/api.ts';

const SentEmailsPage: React.FC = () => {
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    loadSentEmails();
  }, []);

  const loadSentEmails = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSentEmails();
      if (response.success && response.data) {
        setEmails(response.data.emails);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load sent emails');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (emailId: string) => {
    try {
      setRetrying(emailId);
      const response = await apiService.retryEmail(emailId);
      if (response.success) {
        // Refresh the list to show updated status
        await loadSentEmails();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retry email');
    } finally {
      setRetrying(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Sent
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Failed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Sent Emails</h1>
          <p className="mt-2 text-sm text-gray-700">
            View and manage your sent emails with idempotency tracking.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            to="/compose"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            Compose Email
          </Link>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              {emails.length === 0 ? (
                <div className="text-center py-12">
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No sent emails</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by composing your first email.
                  </p>
                  <div className="mt-6">
                    <Link
                      to="/compose"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Compose Email
                    </Link>
                  </div>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recipients
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Note
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Template
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sent
                      </th>
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {emails.map((email) => (
                      <tr key={email.id}>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                            {email.subject}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500">
                            {email.recipients.slice(0, 2).join(', ')}
                            {email.recipients.length > 2 && (
                              <span className="text-gray-400">
                                {' '}+{email.recipients.length - 2} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {email.note_title}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {email.template_name}
                            <span className="text-xs text-gray-400 ml-1">
                              v{email.template_version}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(email.status)}
                          {email.error_message && (
                            <div className="text-xs text-red-600 mt-1 max-w-xs truncate">
                              {email.error_message}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {email.sent_at 
                            ? new Date(email.sent_at).toLocaleString()
                            : '-'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            to={`/sent/${email.id}`}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            View
                          </Link>
                          {email.status === 'failed' && (
                            <button
                              onClick={() => handleRetry(email.id)}
                              disabled={retrying === email.id}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            >
                              {retrying === email.id ? 'Retrying...' : 'Retry'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SentEmailsPage;
