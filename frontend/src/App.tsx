import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Context Providers
import { AuthProvider } from './contexts/AuthContext';

// Components
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';

// Pages
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import TokenSetup from './pages/TokenSetup';
import MALCallback from './pages/MALCallback';
import Search from './pages/Search';

// Create a theme instance
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#f5f5f5',
        },
      },
    },
  },
});

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AuthProvider>
            <Router>
              <Routes>
                {/* Public routes */}
                <Route
                  path="/login"
                  element={
                    <ProtectedRoute requireAuth={false}>
                      <Login />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <ProtectedRoute requireAuth={false}>
                      <Register />
                    </ProtectedRoute>
                  }
                />
                
                {/* OAuth callback route */}
                <Route
                  path="/auth/mal/callback"
                  element={
                    <ProtectedRoute>
                      <MALCallback />
                    </ProtectedRoute>
                  }
                />

                {/* Protected routes with layout */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  {/* Redirect root to dashboard */}
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  
                  {/* Dashboard */}
                  <Route path="dashboard" element={<Dashboard />} />
                  
                  {/* Anime Lists - Placeholder routes */}
                  <Route path="lists">
                    <Route index element={<Navigate to="/lists/watching" replace />} />
                    <Route path="watching" element={<div>Currently Watching - Coming Soon</div>} />
                    <Route path="completed" element={<div>Completed - Coming Soon</div>} />
                    <Route path="on-hold" element={<div>On Hold - Coming Soon</div>} />
                    <Route path="dropped" element={<div>Dropped - Coming Soon</div>} />
                    <Route path="plan-to-watch" element={<div>Plan to Watch - Coming Soon</div>} />
                  </Route>
                  
                  {/* Search */}
                  <Route path="search" element={<Search />} />
                  
                  {/* Mappings */}
                  <Route path="mappings" element={<div>Mappings - Coming Soon</div>} />
                  
                  {/* Settings */}
                  <Route path="settings">
                    <Route index element={<div>Settings - Coming Soon</div>} />
                    <Route path="mal-token" element={<TokenSetup />} />
                  </Route>
                  
                  {/* Profile */}
                  <Route path="profile" element={<div>Profile - Coming Soon</div>} />
                </Route>

                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;