/**
 * Mobile-specific navigation component with bottom navigation
 */
import React from 'react';
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Badge,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  PlayArrow as PlayArrowIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  List as ListIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

interface MobileNavigationProps {
  className?: string;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({ className }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  // Determine current tab based on pathname
  const getCurrentTab = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 0;
    if (path.startsWith('/lists')) return 1;
    if (path === '/search') return 2;
    if (path.startsWith('/settings')) return 3;
    return 0; // Default to dashboard
  };

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    switch (newValue) {
      case 0:
        navigate('/dashboard');
        break;
      case 1:
        navigate('/lists/watching');
        break;
      case 2:
        navigate('/search');
        break;
      case 3:
        navigate('/settings');
        break;
      default:
        navigate('/dashboard');
    }
  };

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: theme.zIndex.appBar,
        // Add safe area padding for devices with home indicators
        paddingBottom: 'env(safe-area-inset-bottom)',
        borderTop: `1px solid ${theme.palette.divider}`,
      }}
      elevation={8}
      className={className}
    >
      <BottomNavigation
        value={getCurrentTab()}
        onChange={handleChange}
        sx={{
          height: 64, // Standard bottom navigation height
          '& .MuiBottomNavigationAction-root': {
            minWidth: 'auto',
            paddingTop: 1,
            paddingBottom: 1,
            '&.Mui-selected': {
              color: theme.palette.primary.main,
            },
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.75rem',
            '&.Mui-selected': {
              fontSize: '0.75rem',
            },
          },
        }}
      >
        <BottomNavigationAction
          label="Dashboard"
          icon={<DashboardIcon />}
          sx={{
            '& .MuiSvgIcon-root': {
              fontSize: '1.5rem',
            },
          }}
        />
        
        <BottomNavigationAction
          label="My Lists"
          icon={
            <Badge 
              color="primary" 
              variant="dot" 
              invisible={!location.pathname.startsWith('/lists')}
            >
              <ListIcon />
            </Badge>
          }
          sx={{
            '& .MuiSvgIcon-root': {
              fontSize: '1.5rem',
            },
          }}
        />
        
        <BottomNavigationAction
          label="Search"
          icon={<SearchIcon />}
          sx={{
            '& .MuiSvgIcon-root': {
              fontSize: '1.5rem',
            },
          }}
        />
        
        <BottomNavigationAction
          label="Settings"
          icon={<SettingsIcon />}
          sx={{
            '& .MuiSvgIcon-root': {
              fontSize: '1.5rem',
            },
          }}
        />
      </BottomNavigation>
    </Paper>
  );
};

export default MobileNavigation;