import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './App.css';

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
});

// Create a client
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <div className="App">
            <header className="App-header">
              <h1>Anime Management System</h1>
              <p>Welcome to your anime tracking application!</p>
            </header>
            <main>
              <Routes>
                <Route path="/" element={<div>Home Page - Coming Soon</div>} />
                <Route path="/anime" element={<div>Anime List - Coming Soon</div>} />
                <Route path="/profile" element={<div>Profile - Coming Soon</div>} />
              </Routes>
            </main>
          </div>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;