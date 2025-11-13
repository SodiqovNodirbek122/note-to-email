import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { EmailTemplate } from '../types/index.ts';
import { apiService } from '../services/api.ts';

const TemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTemplates();
      if (response.success && response.data) {
        setTemplates(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await apiService.deleteTemplate(id);
      setTemplates(templates.filter(template => template.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete template');
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
          <h1 className="text-xl font-semibold text-gray-900">Email Templates</h1>
          <p className="mt-2 text-sm text-gray-700">
            Create and manage email templates that can be merged with your notes.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            to="/templates/new"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            Create Template
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
              {templates.length === 0 ? (
                <div className="text-center py-12">
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No templates</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating a new email template.
                  </p>
                  <div className="mt-6">
                    <Link
                      to="/templates/new"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Create Template
                    </Link>
                  </div>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Variables
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Version
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Updated
                      </th>
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {templates.map((template) => (
                      <tr key={template.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {template.name}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {template.subject}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {template.variables.slice(0, 3).map((variable, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {variable}
                              </span>
                            ))}
                            {template.variables.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{template.variables.length - 3} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          v{template.version}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(template.updated_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            to={`/templates/${template.id}/edit`}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(template.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
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

export default TemplatesPage;
