import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Logout,
  Settings,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, title = 'Anime Management System' }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    handleMenuClose();
    navigate('/profile');
  };

  const handleSettings = () => {
    handleMenuClose();
    navigate('/settings');
  };

  const handleLogout = async () => {
    handleMenuClose();
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Still navigate to login even if logout API call fails
      navigate('/login');
    }
  };

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        // Add safe area padding for mobile devices with notches
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <Toolbar sx={{ 
        minHeight: { xs: 56, sm: 64 }, // Standard mobile/desktop heights
        px: { xs: 1, sm: 2 }, // Responsive padding
      }}>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          onClick={onMenuClick}
          edge="start"
          sx={{ 
            mr: { xs: 1, sm: 2 },
            // Larger touch target on mobile
            width: { xs: 48, sm: 40 },
            height: { xs: 48, sm: 40 },
          }}
        >
          <MenuIcon />
        </IconButton>

        <Typography 
          variant={isMobile ? "h6" : "h6"} 
          noWrap 
          component="div" 
          sx={{ 
            flexGrow: 1,
            fontSize: { xs: '1.1rem', sm: '1.25rem' },
            // Truncate title on very small screens
            maxWidth: { xs: '150px', sm: 'none' },
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {isMobile ? 'AMS' : title}
        </Typography>

        {user && (
          <Box display="flex" alignItems="center">
            <Typography 
              variant="body2" 
              sx={{ 
                mr: { xs: 1, sm: 2 }, 
                display: { xs: 'none', sm: 'block' },
                fontSize: { sm: '0.875rem' },
              }}
            >
              Welcome, {user.name}
            </Typography>
            
            <Tooltip title="Account settings">
              <IconButton
                onClick={handleMenuOpen}
                size={isMobile ? "medium" : "small"}
                sx={{ 
                  ml: { xs: 0, sm: 2 },
                  // Larger touch target on mobile
                  width: { xs: 48, sm: 40 },
                  height: { xs: 48, sm: 40 },
                }}
                aria-controls={anchorEl ? 'account-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={anchorEl ? 'true' : undefined}
              >
                <Avatar sx={{ 
                  width: { xs: 36, sm: 32 }, 
                  height: { xs: 36, sm: 32 },
                  fontSize: { xs: '1.1rem', sm: '1rem' },
                }}>
                  {user.name.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={anchorEl}
              id="account-menu"
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              onClick={handleMenuClose}
              PaperProps={{
                elevation: 0,
                sx: {
                  overflow: 'visible',
                  filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                  mt: 1.5,
                  minWidth: isMobile ? 200 : 180, // Wider on mobile
                  '& .MuiMenuItem-root': {
                    minHeight: isMobile ? 48 : 40, // Larger touch targets
                    px: isMobile ? 3 : 2,
                    fontSize: isMobile ? '1rem' : '0.875rem',
                  },
                  '& .MuiAvatar-root': {
                    width: 32,
                    height: 32,
                    ml: -0.5,
                    mr: 1,
                  },
                  '&:before': {
                    content: '""',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    right: 14,
                    width: 10,
                    height: 10,
                    bgcolor: 'background.paper',
                    transform: 'translateY(-50%) rotate(45deg)',
                    zIndex: 0,
                  },
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={handleProfile}>
                <AccountCircle sx={{ mr: 2 }} />
                Profile
              </MenuItem>
              <MenuItem onClick={handleSettings}>
                <Settings sx={{ mr: 2 }} />
                Settings
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <Logout sx={{ mr: 2 }} />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;