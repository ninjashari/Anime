/**
 * StatCard component for displaying individual dashboard metrics
 */
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Skeleton,
  useTheme
} from '@mui/material';
import { StatCardProps } from '../../types/dashboard';

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  loading = false
}) => {
  const theme = useTheme();

  if (loading) {
    return (
      <Card sx={{ height: '100%', minHeight: 120 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={1}>
            {icon && (
              <Box mr={1} color="primary.main">
                {icon}
              </Box>
            )}
            <Skeleton variant="text" width="60%" height={24} />
          </Box>
          <Skeleton variant="text" width="80%" height={32} />
          {subtitle && <Skeleton variant="text" width="50%" height={20} />}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      sx={{ 
        height: '100%', 
        minHeight: 120,
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4]
        }
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" mb={1}>
          {icon && (
            <Box mr={1} color="primary.main" display="flex" alignItems="center">
              {icon}
            </Box>
          )}
          <Typography 
            variant="h6" 
            component="h3" 
            color="text.secondary"
            sx={{ fontWeight: 500 }}
          >
            {title}
          </Typography>
        </Box>
        
        <Typography 
          variant="h4" 
          component="div" 
          color="primary.main"
          sx={{ 
            fontWeight: 'bold',
            mb: subtitle ? 0.5 : 0,
            wordBreak: 'break-word'
          }}
        >
          {value}
        </Typography>
        
        {subtitle && (
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;