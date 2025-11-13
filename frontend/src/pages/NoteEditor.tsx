import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Note } from '../types/index.ts';
import { apiService } from '../services/api.ts';

const NoteEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = id !== 'new';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditing && id) {
      loadNote(id);
    }
  }, [id, isEditing]);

  const loadNote = async (noteId: string) => {
    try {
      setLoading(true);
      const response = await apiService.getNote(noteId);
      if (response.success && response.data) {
        setTitle(response.data.title);
        setContent(response.data.content);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load note');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (isEditing && id) {
        await apiService.updateNote(id, title, content);
      } else {
        await apiService.createNote(title, content);
      }

      navigate('/notes');
    } catch (err: any) {
      setError(err.message || 'Failed to save note');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/notes');
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
            {isEditing ? 'Edit Note' : 'Create Note'}
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
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="title"
              id="title"
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="Enter note title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700">
            Content (Markdown supported)
          </label>
          <div className="mt-1">
            <textarea
              id="content"
              name="content"
              rows={20}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md font-mono"
              placeholder="Enter your note content in Markdown format..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            You can use Markdown syntax. Variables like {'{'}{'{'} note_title {'}'}{'}'}  and {'{'}{'{'} note_content {'}'}{'}'}  will be available in email templates.
          </p>
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
            {loading ? 'Saving...' : isEditing ? 'Update Note' : 'Create Note'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NoteEditor;
