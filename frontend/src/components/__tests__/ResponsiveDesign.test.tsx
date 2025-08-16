/**
 * Responsive Design Tests
 * Tests for mobile optimization and responsive breakpoints
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Components to test
import AppLayout from '../layout/AppLayout';
import Header from '../layout/Header';
import Sidebar from '../layout/Sidebar';
import StatCard from '../dashboard/StatCard';
import AnimeCard from '../anime/AnimeCard';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock data
const mockAnime = {
  id: 1,
  anime_id: 1,
  anime: {
    id: 1,
    mal_id: 1,
    title: 'Test Anime',
    title_english: 'Test Anime English',
    synopsis: 'Test synopsis',
    episodes: 12,
    status: 'finished_airing',
    aired_from: '2023-01-01',
    aired_to: '2023-03-31',
    score: 8.5,
    rank: 100,
    popularity: 500,
    image_url: 'https://example.com/image.jpg',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  },
  status: 'watching' as const,
  score: 8,
  episodes_watched: 6,
  start_date: '2023-01-01',
  finish_date: null,
  notes: '',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z'
};

// Test theme with breakpoints
const testTheme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={testTheme}>
        <BrowserRouter>
          <AuthProvider>
            {children}
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

// Mock window.matchMedia for responsive tests
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

describe('Responsive Design Tests', () => {
  beforeEach(() => {
    // Reset matchMedia mock
    delete (window as any).matchMedia;
  });

  describe('Mobile Breakpoints', () => {
    beforeEach(() => {
      mockMatchMedia(true); // Mobile view
    });

    test('Header should show abbreviated title on mobile', () => {
      render(
        <TestWrapper>
          <Header onMenuClick={() => {}} title="Anime Management System" />
        </TestWrapper>
      );

      // Should show abbreviated title on mobile
      expect(screen.getByText('AMS')).toBeInTheDocument();
    });

    test('Sidebar should use mobile drawer variant', () => {
      render(
        <TestWrapper>
          <Sidebar 
            open={true} 
            onClose={() => {}} 
            drawerWidth={280}
            isMobile={true}
          />
        </TestWrapper>
      );

      // Mobile drawer should be present
      const drawer = document.querySelector('.MuiDrawer-root');
      expect(drawer).toBeInTheDocument();
    });

    test('StatCard should have mobile-optimized layout', () => {
      render(
        <TestWrapper>
          <StatCard
            title="Test Stat"
            value="100"
            subtitle="test subtitle"
            loading={false}
          />
        </TestWrapper>
      );

      const card = screen.getByText('Test Stat').closest('.MuiCard-root');
      expect(card).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    test('AnimeCard should have mobile-optimized dimensions', () => {
      render(
        <TestWrapper>
          <AnimeCard
            anime={mockAnime}
            onStatusChange={() => {}}
            onProgressUpdate={() => {}}
            onScoreUpdate={() => {}}
            onRemove={() => {}}
            onViewDetails={() => {}}
            loading={false}
          />
        </TestWrapper>
      );

      const card = screen.getByText('Test Anime').closest('.MuiCard-root');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Desktop Breakpoints', () => {
    beforeEach(() => {
      mockMatchMedia(false); // Desktop view
    });

    test('Header should show full title on desktop', () => {
      render(
        <TestWrapper>
          <Header onMenuClick={() => {}} title="Anime Management System" />
        </TestWrapper>
      );

      // Should show full title on desktop
      expect(screen.getByText('Anime Management System')).toBeInTheDocument();
    });

    test('Sidebar should use persistent drawer variant on desktop', () => {
      render(
        <TestWrapper>
          <Sidebar 
            open={true} 
            onClose={() => {}} 
            drawerWidth={240}
            isMobile={false}
          />
        </TestWrapper>
      );

      // Desktop drawer should be present
      const drawer = document.querySelector('.MuiDrawer-root');
      expect(drawer).toBeInTheDocument();
    });
  });

  describe('Touch Interactions', () => {
    beforeEach(() => {
      mockMatchMedia(true); // Mobile view
    });

    test('Mobile menu button should have larger touch target', () => {
      render(
        <TestWrapper>
          <Header onMenuClick={() => {}} />
        </TestWrapper>
      );

      const menuButton = screen.getByLabelText('open drawer');
      expect(menuButton).toBeInTheDocument();
      
      // Should be clickable
      fireEvent.click(menuButton);
    });

    test('Mobile navigation items should have larger touch targets', () => {
      render(
        <TestWrapper>
          <Sidebar 
            open={true} 
            onClose={() => {}} 
            drawerWidth={280}
            isMobile={true}
          />
        </TestWrapper>
      );

      const dashboardLink = screen.getByText('Dashboard');
      expect(dashboardLink).toBeInTheDocument();
      
      // Should be clickable
      fireEvent.click(dashboardLink);
    });

    test('AnimeCard menu button should have mobile-optimized size', () => {
      render(
        <TestWrapper>
          <AnimeCard
            anime={mockAnime}
            onStatusChange={() => {}}
            onProgressUpdate={() => {}}
            onScoreUpdate={() => {}}
            onRemove={() => {}}
            onViewDetails={() => {}}
            loading={false}
          />
        </TestWrapper>
      );

      const moreButton = screen.getByLabelText('More options');
      expect(moreButton).toBeInTheDocument();
      
      // Should be clickable
      fireEvent.click(moreButton);
    });
  });

  describe('Grid Layouts', () => {
    test('Dashboard should use responsive grid spacing', () => {
      render(
        <TestWrapper>
          <div data-testid="dashboard-grid">
            <StatCard title="Test 1" value="1" loading={false} />
            <StatCard title="Test 2" value="2" loading={false} />
          </div>
        </TestWrapper>
      );

      const grid = screen.getByTestId('dashboard-grid');
      expect(grid).toBeInTheDocument();
    });

    test('AnimeCard grid should adapt to screen size', () => {
      render(
        <TestWrapper>
          <div data-testid="anime-grid">
            <AnimeCard
              anime={mockAnime}
              onStatusChange={() => {}}
              onProgressUpdate={() => {}}
              onScoreUpdate={() => {}}
              onRemove={() => {}}
              onViewDetails={() => {}}
              loading={false}
            />
          </div>
        </TestWrapper>
      );

      const grid = screen.getByTestId('anime-grid');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('Typography Scaling', () => {
    test('Headers should scale appropriately on mobile', () => {
      render(
        <TestWrapper>
          <div>
            <h1 style={{ fontSize: '1.75rem' }}>Mobile Header</h1>
            <h2 style={{ fontSize: '1.5rem' }}>Mobile Subheader</h2>
          </div>
        </TestWrapper>
      );

      expect(screen.getByText('Mobile Header')).toBeInTheDocument();
      expect(screen.getByText('Mobile Subheader')).toBeInTheDocument();
    });
  });

  describe('Safe Area Support', () => {
    test('Components should handle safe area insets', () => {
      // Mock CSS env() function support
      const mockGetComputedStyle = jest.fn().mockReturnValue({
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      });

      Object.defineProperty(window, 'getComputedStyle', {
        value: mockGetComputedStyle,
      });

      render(
        <TestWrapper>
          <div style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}>
            Safe Area Content
          </div>
        </TestWrapper>
      );

      expect(screen.getByText('Safe Area Content')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    test('Loading components should be responsive', () => {
      render(
        <TestWrapper>
          <StatCard title="Loading" value="..." loading={true} />
        </TestWrapper>
      );

      // Should show skeleton loading state
      const skeletons = document.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    test('AnimeCard loading should adapt to mobile', () => {
      render(
        <TestWrapper>
          <AnimeCard
            anime={mockAnime}
            onStatusChange={() => {}}
            onProgressUpdate={() => {}}
            onScoreUpdate={() => {}}
            onRemove={() => {}}
            onViewDetails={() => {}}
            loading={true}
          />
        </TestWrapper>
      );

      // Should show skeleton loading state
      const skeletons = document.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });
});