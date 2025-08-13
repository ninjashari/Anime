import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Paper
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { malApi } from '../services/malApi';

const MALCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Mutation for handling OAuth callback
  const callbackMutation = useMutation({
    mutationFn: malApi.handleCallback,
    onSuccess: (data) => {
      setStatus('success');
      // Invalidate queries to refresh token status
      queryClient.invalidateQueries({ queryKey: ['mal-token-status'] });
      queryClient.invalidateQueries({ queryKey: ['mal-user-info'] });
      // Refresh user data to update mal_token_expires_at
      refreshUser();
      
      // Redirect to token setup page after a short delay
      setTimeout(() => {
        navigate('/settings/mal-token', { replace: true });
      }, 3000);
    },
    onError: (error: any) => {
      setStatus('error');
      setErrorMessage(error.message || 'Failed to process authorization');
    }
  });

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      setStatus('error');
      setErrorMessage(errorDescription || error || 'Authorization was denied');
      return;
    }

    if (!code || !state) {
      setStatus('error');
      setErrorMessage('Missing authorization code or state parameter');
      return;
    }

    // Process the callback
    callbackMutation.mutate({ code, state });
  }, [searchParams, callbackMutation]);

  const handleReturnToSetup = () => {
    navigate('/settings/mal-token', { replace: true });
  };

  const handleRetry = () => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    if (code && state) {
      setStatus('processing');
      setErrorMessage('');
      callbackMutation.mutate({ code, state });
    }
  };

  return (
    <Container maxWidth="sm">
      <Box py={8}>
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
          {status === 'processing' && (
            <>
              <CircularProgress size={48} sx={{ mb: 3 }} />
              <Typography variant="h5" gutterBottom>
                Processing Authorization
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Please wait while we complete your MyAnimeList authorization...
              </Typography>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircleIcon 
                sx={{ fontSize: 48, color: 'success.main', mb: 3 }} 
              />
              <Typography variant="h5" gutterBottom color="success.main">
                Authorization Successful!
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Your MyAnimeList account has been successfully connected. 
                You will be redirected to the settings page shortly.
              </Typography>
              <Button
                variant="contained"
                onClick={handleReturnToSetup}
                sx={{ mt: 2 }}
              >
                Continue to Settings
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <ErrorIcon 
                sx={{ fontSize: 48, color: 'error.main', mb: 3 }} 
              />
              <Typography variant="h5" gutterBottom color="error.main">
                Authorization Failed
              </Typography>
              <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                {errorMessage}
              </Alert>
              <Box display="flex" gap={2} justifyContent="center">
                <Button
                  variant="outlined"
                  onClick={handleReturnToSetup}
                >
                  Return to Setup
                </Button>
                {searchParams.get('code') && (
                  <Button
                    variant="contained"
                    onClick={handleRetry}
                    disabled={callbackMutation.isPending}
                  >
                    {callbackMutation.isPending ? 'Retrying...' : 'Retry'}
                  </Button>
                )}
              </Box>
            </>
          )}
        </Paper>

        {/* Additional Information */}
        <Box mt={4} textAlign="center">
          <Typography variant="body2" color="text.secondary">
            Having trouble? You can always return to the{' '}
            <Button
              variant="text"
              size="small"
              onClick={handleReturnToSetup}
              sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
            >
              token setup page
            </Button>
            {' '}to try again.
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default MALCallback;