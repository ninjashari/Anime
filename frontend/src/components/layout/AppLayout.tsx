import React, { useState, useEffect } from 'react';
import { Box, Toolbar, useTheme, useMediaQuery } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileNavigation from './MobileNavigation';
import ErrorBoundary from '../common/ErrorBoundary';

const DRAWER_WIDTH = 240;
const MOBILE_DRAWER_WIDTH = 280; // Slightly wider on mobile for better touch targets

const AppLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);

  // Close mobile drawer when switching to desktop
  useEffect(() => {
    if (!isMobile && mobileOpen) {
      setMobileOpen(false);
    }
  }, [isMobile, mobileOpen]);

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setDesktopOpen(!desktopOpen);
    }
  };

  const handleMobileDrawerClose = () => {
    setMobileOpen(false);
  };

  // Determine drawer width based on screen size
  const drawerWidth = isMobile ? MOBILE_DRAWER_WIDTH : DRAWER_WIDTH;
  
  // Determine if drawer is open based on screen size
  const isDrawerOpen = isMobile ? mobileOpen : desktopOpen;

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Header onMenuClick={handleDrawerToggle} />
      
      <Sidebar
        open={isDrawerOpen}
        onClose={handleMobileDrawerClose}
        drawerWidth={drawerWidth}
        isMobile={isMobile}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: '100vh',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Toolbar />
        <Box
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            p: {
              xs: 1, // Minimal padding on mobile
              sm: 2, // Medium padding on tablet
              md: 3, // Full padding on desktop
            },
            width: { 
              md: desktopOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' 
            },
            ml: { 
              md: desktopOpen ? `${DRAWER_WIDTH}px` : 0 
            },
            transition: theme.transitions.create(['margin', 'width'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
            // Add safe area padding for mobile devices with notches
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: isMobile ? '80px' : 'env(safe-area-inset-bottom)', // Extra space for mobile nav
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)',
          }}
        >
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </Box>
      </Box>
      
      {/* Mobile bottom navigation */}
      {isMobile && <MobileNavigation />}
    </Box>
  );
};

export default AppLayout;