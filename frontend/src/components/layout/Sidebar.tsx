import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Box,
  Collapse,
} from '@mui/material';
import {
  Dashboard,
  PlayArrow,
  CheckCircle,
  Pause,
  Cancel,
  Schedule,
  Search,
  Settings,
  Link as LinkIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  drawerWidth?: number;
  isMobile?: boolean;
}

interface NavItem {
  text: string;
  icon: React.ReactElement;
  path: string;
  children?: NavItem[];
}

const navigationItems: NavItem[] = [
  {
    text: 'Dashboard',
    icon: <Dashboard />,
    path: '/dashboard',
  },
  {
    text: 'My Lists',
    icon: <PlayArrow />,
    path: '/lists',
    children: [
      {
        text: 'Currently Watching',
        icon: <PlayArrow />,
        path: '/lists/watching',
      },
      {
        text: 'Completed',
        icon: <CheckCircle />,
        path: '/lists/completed',
      },
      {
        text: 'On Hold',
        icon: <Pause />,
        path: '/lists/on-hold',
      },
      {
        text: 'Dropped',
        icon: <Cancel />,
        path: '/lists/dropped',
      },
      {
        text: 'Plan to Watch',
        icon: <Schedule />,
        path: '/lists/plan-to-watch',
      },
    ],
  },
  {
    text: 'Search Anime',
    icon: <Search />,
    path: '/search',
  },
  {
    text: 'Mappings',
    icon: <LinkIcon />,
    path: '/mappings',
  },
  {
    text: 'Settings',
    icon: <Settings />,
    path: '/settings',
    children: [
      {
        text: 'MyAnimeList Token',
        icon: <LinkIcon />,
        path: '/settings/mal-token',
      },
    ],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ open, onClose, drawerWidth = 240, isMobile = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(isMobile ? [] : ['My Lists']);

  const handleNavigation = (path: string) => {
    navigate(path);
    // Close drawer on mobile after navigation
    if (isMobile) {
      onClose();
    }
  };

  const handleExpandClick = (text: string) => {
    setExpandedItems(prev =>
      prev.includes(text)
        ? prev.filter(item => item !== text)
        : [...prev, text]
    );
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.text);
    const active = isActive(item.path);

    return (
      <React.Fragment key={item.text}>
        <ListItem disablePadding sx={{ pl: depth * (isMobile ? 1.5 : 2) }}>
          <ListItemButton
            selected={active}
            onClick={() => {
              if (hasChildren) {
                handleExpandClick(item.text);
              } else {
                handleNavigation(item.path);
              }
            }}
            sx={{
              minHeight: isMobile ? 56 : 48, // Larger touch targets on mobile
              justifyContent: open ? 'initial' : 'center',
              px: isMobile ? 3 : 2.5, // More padding on mobile
              borderRadius: isMobile ? 2 : 0, // Rounded corners on mobile
              mx: isMobile ? 1 : 0, // Margin on mobile for rounded effect
              '&.Mui-selected': {
                backgroundColor: isMobile ? 'primary.main' : 'action.selected',
                color: isMobile ? 'primary.contrastText' : 'inherit',
                '&:hover': {
                  backgroundColor: isMobile ? 'primary.dark' : 'action.selected',
                },
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: open ? 3 : 'auto',
                justifyContent: 'center',
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.text}
              sx={{ opacity: open ? 1 : 0 }}
            />
            {hasChildren && open && (
              isExpanded ? <ExpandLess /> : <ExpandMore />
            )}
          </ListItemButton>
        </ListItem>

        {hasChildren && (
          <Collapse in={isExpanded && open} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map(child => renderNavItem(child, depth + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const drawer = (
    <Box sx={{ 
      overflow: 'auto',
      height: '100%',
      // Add padding for mobile safe areas
      ...(isMobile && {
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      })
    }}>
      <Toolbar />
      <Divider />
      <List sx={{ 
        px: isMobile ? 1 : 0,
        py: isMobile ? 2 : 1,
      }}>
        {navigationItems.map(item => renderNavItem(item))}
      </List>
      
      {/* Add some bottom spacing on mobile for better scrolling */}
      {isMobile && <Box sx={{ height: 80 }} />}
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            // Enhanced mobile drawer styling
            borderTopRightRadius: 16,
            borderBottomRightRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="persistent"
        open={open}
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default Sidebar;