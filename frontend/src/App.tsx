import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import Layout from './components/Layout.tsx';
import Login from './components/Login.tsx';
import NotesPage from './pages/NotesPage.tsx';
import NoteEditor from './pages/NoteEditor.tsx';
import TemplatesPage from './pages/TemplatesPage.tsx';
import TemplateEditor from './pages/TemplateEditor.tsx';
import ComposePage from './pages/ComposePage.tsx';
import SentEmailsPage from './pages/SentEmailsPage.tsx';
import AuthCallback from './pages/AuthCallback.tsx';
import NylasCallback from './pages/NylasCallback.tsx';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to="/notes" /> : <Login />} 
      />
      <Route 
        path="/auth/callback" 
        element={<AuthCallback />} 
      />
      <Route 
        path="/auth/nylas/callback" 
        element={<NylasCallback />} 
      />
      <Route
        path="/notes"
        element={
          <ProtectedRoute>
            <NotesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notes/new"
        element={
          <ProtectedRoute>
            <NoteEditor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notes/:id/edit"
        element={
          <ProtectedRoute>
            <NoteEditor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/templates"
        element={
          <ProtectedRoute>
            <TemplatesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/templates/new"
        element={
          <ProtectedRoute>
            <TemplateEditor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/templates/:id/edit"
        element={
          <ProtectedRoute>
            <TemplateEditor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/compose"
        element={
          <ProtectedRoute>
            <ComposePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sent"
        element={
          <ProtectedRoute>
            <SentEmailsPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/notes" />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
