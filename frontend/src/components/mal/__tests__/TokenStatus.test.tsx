import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import TokenStatus from '../TokenStatus';
import { MALTokenStatus, MALUserInfo } from '../../../services/malApi';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('TokenStatus', () => {
  const mockOnRefreshToken = jest.fn();
  const mockOnRevokeToken = jest.fn();
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    tokenStatus: null,
    userInfo: null,
    isLoading: false,
    error: null,
    onRefreshToken: mockOnRefreshToken,
    onRevokeToken: mockOnRevokeToken,
    onRetry: mockOnRetry,
    isRefreshing: false,
    isRevoking: false,
  };

  it('should show loading state', () => {
    renderWithTheme(
      <TokenStatus {...defaultProps} isLoading={true} />
    );

    expect(screen.getByText('Checking MyAnimeList token status...')).toBeInTheDocument();
  });

  it('should show error state with retry button', () => {
    renderWithTheme(
      <TokenStatus {...defaultProps} error="Network error" />
    );

    expect(screen.getByText('Failed to check token status: Network error')).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalled();
  });

  it('should show no token status message', () => {
    renderWithTheme(
      <TokenStatus {...defaultProps} />
    );

    expect(screen.getByText('No token status information available.')).toBeInTheDocument();
  });

  it('should show not connected status', () => {
    const tokenStatus: MALTokenStatus = {
      has_tokens: false,
      expires_at: null,
      is_expired: false,
    };

    renderWithTheme(
      <TokenStatus {...defaultProps} tokenStatus={tokenStatus} />
    );

    expect(screen.getByText('Not Connected')).toBeInTheDocument();
    expect(screen.getByText(/you haven't connected your myanimelist account yet/i)).toBeInTheDocument();
  });

  it('should show connected status with valid token', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const tokenStatus: MALTokenStatus = {
      has_tokens: true,
      expires_at: futureDate.toISOString(),
      is_expired: false,
      username: 'testuser',
    };

    renderWithTheme(
      <TokenStatus {...defaultProps} tokenStatus={tokenStatus} />
    );

    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('Expires in 30 days')).toBeInTheDocument();
  });

  it('should show expired token status', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);

    const tokenStatus: MALTokenStatus = {
      has_tokens: true,
      expires_at: pastDate.toISOString(),
      is_expired: true,
      username: 'testuser',
    };

    renderWithTheme(
      <TokenStatus {...defaultProps} tokenStatus={tokenStatus} />
    );

    expect(screen.getByText('Token Expired')).toBeInTheDocument();
    expect(screen.getByText('Expired 5 days ago')).toBeInTheDocument();
  });

  it('should show user information when available', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const tokenStatus: MALTokenStatus = {
      has_tokens: true,
      expires_at: futureDate.toISOString(),
      is_expired: false,
      username: 'testuser',
    };

    const userInfo: MALUserInfo = {
      id: 123,
      name: 'TestUser',
      picture: 'https://example.com/avatar.jpg',
      joined_at: '2020-01-01T00:00:00Z',
    };

    renderWithTheme(
      <TokenStatus {...defaultProps} tokenStatus={tokenStatus} userInfo={userInfo} />
    );

    expect(screen.getByText('TestUser')).toBeInTheDocument();
    expect(screen.getByText('Member since 2020')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'TestUser' })).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('should handle refresh token button click', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const tokenStatus: MALTokenStatus = {
      has_tokens: true,
      expires_at: futureDate.toISOString(),
      is_expired: false,
      username: 'testuser',
    };

    renderWithTheme(
      <TokenStatus {...defaultProps} tokenStatus={tokenStatus} />
    );

    const refreshButton = screen.getByRole('button', { name: /refresh token/i });
    fireEvent.click(refreshButton);

    expect(mockOnRefreshToken).toHaveBeenCalled();
  });

  it('should handle revoke token button click', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const tokenStatus: MALTokenStatus = {
      has_tokens: true,
      expires_at: futureDate.toISOString(),
      is_expired: false,
      username: 'testuser',
    };

    renderWithTheme(
      <TokenStatus {...defaultProps} tokenStatus={tokenStatus} />
    );

    const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
    fireEvent.click(disconnectButton);

    expect(mockOnRevokeToken).toHaveBeenCalled();
  });

  it('should disable buttons when refreshing', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const tokenStatus: MALTokenStatus = {
      has_tokens: true,
      expires_at: futureDate.toISOString(),
      is_expired: false,
      username: 'testuser',
    };

    renderWithTheme(
      <TokenStatus {...defaultProps} tokenStatus={tokenStatus} isRefreshing={true} />
    );

    expect(screen.getByRole('button', { name: /refreshing.../i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /disconnect/i })).toBeDisabled();
  });

  it('should disable buttons when revoking', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const tokenStatus: MALTokenStatus = {
      has_tokens: true,
      expires_at: futureDate.toISOString(),
      is_expired: false,
      username: 'testuser',
    };

    renderWithTheme(
      <TokenStatus {...defaultProps} tokenStatus={tokenStatus} isRevoking={true} />
    );

    expect(screen.getByRole('button', { name: /refresh token/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /revoking.../i })).toBeDisabled();
  });

  it('should format expiry dates correctly', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tokenStatus: MALTokenStatus = {
      has_tokens: true,
      expires_at: tomorrow.toISOString(),
      is_expired: false,
      username: 'testuser',
    };

    renderWithTheme(
      <TokenStatus {...defaultProps} tokenStatus={tokenStatus} />
    );

    expect(screen.getByText('Expires tomorrow')).toBeInTheDocument();
  });

  it('should handle today expiry', () => {
    // Just test that the component renders without crashing for today's date
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const tokenStatus: MALTokenStatus = {
      has_tokens: true,
      expires_at: today.toISOString(),
      is_expired: false,
      username: 'testuser',
    };

    renderWithTheme(
      <TokenStatus {...defaultProps} tokenStatus={tokenStatus} />
    );

    // Just check that some expiry text is shown (could be "today" or "tomorrow" depending on timing)
    expect(screen.getByText(/expires/i)).toBeInTheDocument();
  });

  it('should handle unknown expiry date', () => {
    const tokenStatus: MALTokenStatus = {
      has_tokens: true,
      expires_at: null,
      is_expired: false,
      username: 'testuser',
    };

    renderWithTheme(
      <TokenStatus {...defaultProps} tokenStatus={tokenStatus} />
    );

    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});