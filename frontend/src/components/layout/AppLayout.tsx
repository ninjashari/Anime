import React, { useState } from 'react';
import { Box, Toolbar } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import ErrorBoundary from '../common/ErrorBoundary';

const DRAWER_WIDTH = 240;

const AppLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);

  const handleDrawerToggle = () => {
    // On mobile, toggle the mobile drawer
    if (window.innerWidth < 600) {
      setMobileOpen(!mobileOpen);
    } else {
      // On desktop, toggle the persistent drawer
      setDesktopOpen(!desktopOpen);
    }
  };

  const handleMobileDrawerClose = () => {
    setMobileOpen(false);
  };

  // Determine if drawer is open based on screen size
  const isDrawerOpen = window.innerWidth < 600 ? mobileOpen : desktopOpen;

  return (
    <Box sx={{ display: 'flex' }}>
      <Header onMenuClick={handleDrawerToggle} />
      
      <Sidebar
        open={isDrawerOpen}
        onClose={handleMobileDrawerClose}
        drawerWidth={DRAWER_WIDTH}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { 
            sm: desktopOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' 
          },
          ml: { 
            sm: desktopOpen ? `${DRAWER_WIDTH}px` : 0 
          },
          transition: (theme) =>
            theme.transitions.create(['margin', 'width'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
        }}
      >
        <Toolbar />
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </Box>
    </Box>
  );
};

export default AppLayout;