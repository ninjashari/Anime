import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  CircularProgress,
  Link,
  Divider
} from '@mui/material';
import {
  Launch as LaunchIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { malApi, MALTokenStatus, MALUserInfo } from '../services/malApi';
import TokenStatus from '../components/mal/TokenStatus';

const TokenSetup: React.FC = () => {
  const { refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState(0);
  const [authUrl, setAuthUrl] = useState<string>('');
  const [authState, setAuthState] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Query for token status
  const {
    data: tokenStatus,
    isLoading: isLoadingStatus,
    error: statusError,
    refetch: refetchStatus
  } = useQuery<MALTokenStatus>({
    queryKey: ['mal-token-status'],
    queryFn: malApi.getTokenStatus,
    retry: 1
  });

  // Query for user info (only if token exists)
  const {
    data: userInfo,
    isLoading: isLoadingUserInfo
  } = useQuery<MALUserInfo>({
    queryKey: ['mal-user-info'],
    queryFn: malApi.getUserInfo,
    enabled: tokenStatus?.hasToken && !tokenStatus?.isExpired,
    retry: 1
  });

  // Mutation for getting auth URL
  const getAuthUrlMutation = useMutation({
    mutationFn: malApi.getAuthUrl,
    onSuccess: (data) => {
      setAuthUrl(data.auth_url);
      setAuthState(data.state);
      setActiveStep(1);
      setErrorMessage('');
    },
    onError: (error: any) => {
      setErrorMessage(error.message || 'Failed to get authorization URL');
    }
  });

  // Mutation for refreshing token
  const refreshTokenMutation = useMutation({
    mutationFn: malApi.refreshToken,
    onSuccess: () => {
      setSuccessMessage('Token refreshed successfully!');
      queryClient.invalidateQueries({ queryKey: ['mal-token-status'] });
      queryClient.invalidateQueries({ queryKey: ['mal-user-info'] });
      refreshUser();
      setTimeout(() => setSuccessMessage(''), 5000);
    },
    onError: (error: any) => {
      setErrorMessage(error.message || 'Failed to refresh token');
    }
  });

  // Mutation for revoking token
  const revokeTokenMutation = useMutation({
    mutationFn: malApi.revokeToken,
    onSuccess: () => {
      setSuccessMessage('MyAnimeList account disconnected successfully!');
      queryClient.invalidateQueries({ queryKey: ['mal-token-status'] });
      queryClient.invalidateQueries({ queryKey: ['mal-user-info'] });
      refreshUser();
      setActiveStep(0);
      setTimeout(() => setSuccessMessage(''), 5000);
    },
    onError: (error: any) => {
      setErrorMessage(error.message || 'Failed to disconnect account');
    }
  });

  // Check if we're already connected
  useEffect(() => {
    if (tokenStatus?.hasToken && !tokenStatus?.isExpired) {
      setActiveStep(3); // Connected step
    } else if (tokenStatus?.hasToken && tokenStatus?.isExpired) {
      setActiveStep(2); // Token expired step
    } else {
      setActiveStep(0); // Not connected step
    }
  }, [tokenStatus]);

  const handleStartAuth = () => {
    setErrorMessage('');
    getAuthUrlMutation.mutate();
  };

  const handleOpenAuthUrl = () => {
    if (authUrl) {
      window.open(authUrl, '_blank', 'width=600,height=700,scrollbars=yes,resizable=yes');
      setActiveStep(2);
    }
  };

  const handleRefreshToken = () => {
    setErrorMessage('');
    refreshTokenMutation.mutate();
  };

  const handleRevokeToken = () => {
    setErrorMessage('');
    revokeTokenMutation.mutate();
  };

  const handleRetryStatus = () => {
    setErrorMessage('');
    refetchStatus();
  };

  const steps = [
    {
      label: 'Start Authorization',
      content: (
        <Box>
          <Typography variant="body2" paragraph>
            To sync your anime lists with MyAnimeList, you need to authorize this application 
            to access your MyAnimeList account.
          </Typography>
          <Button
            variant="contained"
            onClick={handleStartAuth}
            disabled={getAuthUrlMutation.isPending}
            startIcon={getAuthUrlMutation.isPending ? <CircularProgress size={16} /> : <LaunchIcon />}
          >
            {getAuthUrlMutation.isPending ? 'Preparing...' : 'Start Authorization'}
          </Button>
        </Box>
      )
    },
    {
      label: 'Authorize on MyAnimeList',
      content: (
        <Box>
          <Typography variant="body2" paragraph>
            Click the button below to open MyAnimeList in a new window. 
            Log in to your MyAnimeList account and authorize this application.
          </Typography>
          <Button
            variant="contained"
            onClick={handleOpenAuthUrl}
            startIcon={<LaunchIcon />}
            disabled={!authUrl}
          >
            Open MyAnimeList Authorization
          </Button>
          {authUrl && (
            <Box mt={2}>
              <Typography variant="caption" color="text.secondary">
                If the popup was blocked, you can{' '}
                <Link href={authUrl} target="_blank" rel="noopener noreferrer">
                  click here to open the authorization page
                </Link>
              </Typography>
            </Box>
          )}
        </Box>
      )
    },
    {
      label: 'Complete Authorization',
      content: (
        <Box>
          <Typography variant="body2" paragraph>
            After authorizing the application on MyAnimeList, you should be redirected back 
            to this application. The page will automatically update once the authorization is complete.
          </Typography>
          <Alert severity="info">
            <Typography variant="body2">
              If you're not redirected automatically, please refresh this page or check your token status below.
            </Typography>
          </Alert>
        </Box>
      )
    },
    {
      label: 'Connected',
      content: (
        <Box>
          <Alert severity="success" icon={<CheckCircleIcon />}>
            <Typography variant="body2">
              Your MyAnimeList account is successfully connected! 
              You can now sync your anime lists and track your progress automatically.
            </Typography>
          </Alert>
        </Box>
      )
    }
  ];

  return (
    <Container maxWidth="md">
      <Box py={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          MyAnimeList Integration
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Connect your MyAnimeList account to sync your anime lists and enable automatic progress tracking.
        </Typography>

        {/* Success/Error Messages */}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        )}
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMessage('')}>
            {errorMessage}
          </Alert>
        )}

        {/* Token Status Card */}
        <Box mb={4}>
          <TokenStatus
            tokenStatus={tokenStatus || null}
            userInfo={userInfo || null}
            isLoading={isLoadingStatus || isLoadingUserInfo}
            error={statusError?.message || null}
            onRefreshToken={handleRefreshToken}
            onRevokeToken={handleRevokeToken}
            onRetry={handleRetryStatus}
            isRefreshing={refreshTokenMutation.isPending}
            isRevoking={revokeTokenMutation.isPending}
          />
        </Box>

        <Divider sx={{ my: 4 }} />

        {/* Setup Steps */}
        <Paper elevation={1} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Setup Guide
          </Typography>
          
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel>
                  {step.label}
                </StepLabel>
                <StepContent>
                  {step.content}
                </StepContent>
              </Step>
            ))}
          </Stepper>

          {tokenStatus?.hasToken && tokenStatus?.isExpired && (
            <Box mt={3}>
              <Alert severity="warning" icon={<ErrorIcon />}>
                <Typography variant="body2">
                  Your MyAnimeList token has expired. Please refresh your token or re-authorize the application.
                </Typography>
              </Alert>
            </Box>
          )}
        </Paper>

        {/* Additional Information */}
        <Box mt={4}>
          <Typography variant="h6" gutterBottom>
            About MyAnimeList Integration
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            This integration allows the application to:
          </Typography>
          <Box component="ul" sx={{ pl: 2, color: 'text.secondary' }}>
            <Typography component="li" variant="body2">
              Read your anime lists (watching, completed, on-hold, dropped, plan to watch)
            </Typography>
            <Typography component="li" variant="body2">
              Update your anime progress and status
            </Typography>
            <Typography component="li" variant="body2">
              Add new anime to your lists
            </Typography>
            <Typography component="li" variant="body2">
              Sync changes between this application and MyAnimeList
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Your MyAnimeList credentials are never stored by this application. 
            Only the necessary access tokens are stored to enable synchronization.
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default TokenSetup;