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
import Mappings from './pages/Mappings';
import WatchingList from './pages/WatchingList';
import CompletedList from './pages/CompletedList';
import OnHoldList from './pages/OnHoldList';
import DroppedList from './pages/DroppedList';
import PlanToWatchList from './pages/PlanToWatchList';

// Create a theme instance with responsive design enhancements
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
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  typography: {
    // Responsive typography
    h1: {
      fontSize: '2.5rem',
      '@media (max-width:600px)': {
        fontSize: '2rem',
      },
    },
    h2: {
      fontSize: '2rem',
      '@media (max-width:600px)': {
        fontSize: '1.75rem',
      },
    },
    h3: {
      fontSize: '1.75rem',
      '@media (max-width:600px)': {
        fontSize: '1.5rem',
      },
    },
    h4: {
      fontSize: '1.5rem',
      '@media (max-width:600px)': {
        fontSize: '1.25rem',
      },
    },
    h5: {
      fontSize: '1.25rem',
      '@media (max-width:600px)': {
        fontSize: '1.125rem',
      },
    },
    h6: {
      fontSize: '1.125rem',
      '@media (max-width:600px)': {
        fontSize: '1rem',
      },
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
    // Enhanced button styles for mobile
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: '44px', // Minimum touch target size
          '@media (max-width:600px)': {
            minHeight: '48px', // Larger touch targets on mobile
            fontSize: '1rem',
          },
        },
      },
    },
    // Enhanced fab styles for mobile
    MuiFab: {
      styleOverrides: {
        root: {
          '@media (max-width:600px)': {
            width: '56px',
            height: '56px',
          },
        },
      },
    },
    // Enhanced card styles for mobile
    MuiCard: {
      styleOverrides: {
        root: {
          '@media (max-width:600px)': {
            borderRadius: '12px',
          },
        },
      },
    },
    // Enhanced container padding for mobile
    MuiContainer: {
      styleOverrides: {
        root: {
          '@media (max-width:600px)': {
            paddingLeft: '16px',
            paddingRight: '16px',
          },
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
                  
                  {/* Anime Lists */}
                  <Route path="lists">
                    <Route index element={<Navigate to="/lists/watching" replace />} />
                    <Route path="watching" element={<WatchingList />} />
                    <Route path="completed" element={<CompletedList />} />
                    <Route path="on-hold" element={<OnHoldList />} />
                    <Route path="dropped" element={<DroppedList />} />
                    <Route path="plan-to-watch" element={<PlanToWatchList />} />
                  </Route>
                  
                  {/* Search */}
                  <Route path="search" element={<Search />} />
                  
                  {/* Mappings */}
                  <Route path="mappings" element={<Mappings />} />
                  
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