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
  useTheme,
  useMediaQuery
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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (loading) {
    return (
      <Card sx={{ 
        height: '100%', 
        minHeight: { xs: 100, sm: 120 },
        borderRadius: { xs: 2, sm: 1 },
      }}>
        <CardContent sx={{ 
          p: { xs: 2, sm: 3 },
          '&:last-child': { pb: { xs: 2, sm: 3 } }
        }}>
          <Box display="flex" alignItems="center" mb={1}>
            {icon && (
              <Box mr={1} color="primary.main">
                {icon}
              </Box>
            )}
            <Skeleton variant="text" width="60%" height={isMobile ? 20 : 24} />
          </Box>
          <Skeleton variant="text" width="80%" height={isMobile ? 28 : 32} />
          {subtitle && <Skeleton variant="text" width="50%" height={isMobile ? 16 : 20} />}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      sx={{ 
        height: '100%', 
        minHeight: { xs: 100, sm: 120 },
        borderRadius: { xs: 2, sm: 1 },
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: isMobile ? 'none' : 'translateY(-2px)',
          boxShadow: isMobile ? theme.shadows[2] : theme.shadows[4]
        },
        // Add subtle shadow on mobile for better visual separation
        boxShadow: isMobile ? theme.shadows[1] : theme.shadows[1],
      }}
    >
      <CardContent sx={{ 
        p: { xs: 2, sm: 3 },
        '&:last-child': { pb: { xs: 2, sm: 3 } }
      }}>
        <Box 
          display="flex" 
          alignItems="center" 
          mb={{ xs: 0.5, sm: 1 }}
          flexDirection={{ xs: 'column', sm: 'row' }}
          textAlign={{ xs: 'center', sm: 'left' }}
        >
          {icon && (
            <Box 
              mr={{ xs: 0, sm: 1 }} 
              mb={{ xs: 0.5, sm: 0 }}
              color="primary.main" 
              display="flex" 
              alignItems="center"
              sx={{
                '& svg': {
                  fontSize: { xs: '1.2rem', sm: '1.5rem' }
                }
              }}
            >
              {icon}
            </Box>
          )}
          <Typography 
            variant={isMobile ? "body2" : "h6"}
            component="h3" 
            color="text.secondary"
            sx={{ 
              fontWeight: 500,
              fontSize: { xs: '0.75rem', sm: '1.25rem' },
              lineHeight: { xs: 1.2, sm: 1.6 },
            }}
          >
            {title}
          </Typography>
        </Box>
        
        <Typography 
          variant={isMobile ? "h5" : "h4"}
          component="div" 
          color="primary.main"
          sx={{ 
            fontWeight: 'bold',
            mb: subtitle ? 0.5 : 0,
            wordBreak: 'break-word',
            fontSize: { xs: '1.5rem', sm: '2.125rem' },
            lineHeight: { xs: 1.2, sm: 1.167 },
            textAlign: { xs: 'center', sm: 'left' },
          }}
        >
          {value}
        </Typography>
        
        {subtitle && (
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              mt: 0.5,
              fontSize: { xs: '0.7rem', sm: '0.875rem' },
              textAlign: { xs: 'center', sm: 'left' },
            }}
          >
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;