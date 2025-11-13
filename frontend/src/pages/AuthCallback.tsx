import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api.ts';

const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setMessage(`Authorization failed: ${error}`);
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('No authorization code received');
        return;
      }

      try {
        // Send the authorization code to our backend
        const response = await apiService.handleGmailCallback(code);
        
        if (response.success) {
          setStatus('success');
          setMessage('Gmail authorization successful!');
          
          // Redirect to compose page after 2 seconds
          setTimeout(() => {
            navigate('/compose');
          }, 2000);
        } else {
          setStatus('error');
          setMessage(response.error || 'Failed to complete authorization');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Failed to process authorization');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Gmail Authorization
          </h2>
          
          {status === 'processing' && (
            <div className="mt-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Processing authorization...</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="mt-8">
              <div className="rounded-full h-12 w-12 bg-green-100 mx-auto flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <p className="mt-4 text-green-600 font-medium">{message}</p>
              <p className="mt-2 text-gray-500">Redirecting to compose page...</p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="mt-8">
              <div className="rounded-full h-12 w-12 bg-red-100 mx-auto flex items-center justify-center">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <p className="mt-4 text-red-600 font-medium">{message}</p>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/compose')}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go to Compose
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
