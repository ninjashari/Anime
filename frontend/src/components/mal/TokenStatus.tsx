import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Divider
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { MALTokenStatus, MALUserInfo } from '../../services/malApi';

interface TokenStatusProps {
  tokenStatus: MALTokenStatus | null;
  userInfo: MALUserInfo | null;
  isLoading: boolean;
  error: string | null;
  onRefreshToken: () => void;
  onRevokeToken: () => void;
  onRetry: () => void;
  isRefreshing: boolean;
  isRevoking: boolean;
}

const TokenStatus: React.FC<TokenStatusProps> = ({
  tokenStatus,
  userInfo,
  isLoading,
  error,
  onRefreshToken,
  onRevokeToken,
  onRetry,
  isRefreshing,
  isRevoking
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="center" py={3}>
            <CircularProgress size={24} sx={{ mr: 2 }} />
            <Typography>Checking MyAnimeList token status...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert 
            severity="error" 
            action={
              <Button color="inherit" size="small" onClick={onRetry}>
                Retry
              </Button>
            }
          >
            <Typography variant="body2">
              Failed to check token status: {error}
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!tokenStatus) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">
            <Typography variant="body2">
              No token status information available.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const getStatusChip = () => {
    if (!tokenStatus.hasToken) {
      return (
        <Chip
          icon={<ErrorIcon />}
          label="Not Connected"
          color="error"
          variant="outlined"
        />
      );
    }

    if (tokenStatus.isExpired) {
      return (
        <Chip
          icon={<WarningIcon />}
          label="Token Expired"
          color="warning"
          variant="outlined"
        />
      );
    }

    return (
      <Chip
        icon={<CheckCircleIcon />}
        label="Connected"
        color="success"
        variant="outlined"
      />
    );
  };

  const formatExpiryDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `Expired ${Math.abs(diffDays)} days ago`;
    } else if (diffDays === 0) {
      return 'Expires today';
    } else if (diffDays === 1) {
      return 'Expires tomorrow';
    } else {
      return `Expires in ${diffDays} days`;
    }
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6" component="h2">
            MyAnimeList Connection
          </Typography>
          {getStatusChip()}
        </Box>

        <Stack spacing={2}>
          {tokenStatus.hasToken ? (
            <>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Token Status
                </Typography>
                <Typography variant="body1">
                  {formatExpiryDate(tokenStatus.tokenExpiresAt)}
                </Typography>
              </Box>

              {userInfo && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Connected Account
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      {userInfo.picture && (
                        <Box
                          component="img"
                          src={userInfo.picture}
                          alt={userInfo.name}
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            objectFit: 'cover'
                          }}
                        />
                      )}
                      <Box>
                        <Typography variant="body1" fontWeight="medium">
                          {userInfo.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Member since {new Date(userInfo.joined_at).getFullYear()}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </>
              )}

              <Divider />
              <Box display="flex" gap={1} flexWrap="wrap">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={onRefreshToken}
                  disabled={isRefreshing || isRevoking}
                >
                  {isRefreshing ? 'Refreshing...' : 'Refresh Token'}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<DeleteIcon />}
                  onClick={onRevokeToken}
                  disabled={isRefreshing || isRevoking}
                >
                  {isRevoking ? 'Revoking...' : 'Disconnect'}
                </Button>
              </Box>
            </>
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary">
                You haven't connected your MyAnimeList account yet. 
                Connect your account to sync your anime lists and enable automatic updates.
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default TokenStatus;