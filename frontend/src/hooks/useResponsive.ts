/**
 * Custom hook for responsive design utilities
 */
import { useTheme, useMediaQuery } from '@mui/material/styles';
import { Breakpoint } from '@mui/material/styles';
import { useEffect, useState } from 'react';

export interface ResponsiveValues {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isSmallScreen: boolean;
  screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  orientation: 'portrait' | 'landscape';
  touchDevice: boolean;
}

/**
 * Hook for responsive design utilities
 */
export const useResponsive = (): ResponsiveValues => {
  const theme = useTheme();
  
  // Breakpoint queries
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  
  // Individual breakpoint checks
  const isXs = useMediaQuery(theme.breakpoints.only('xs'));
  const isSm = useMediaQuery(theme.breakpoints.only('sm'));
  const isMd = useMediaQuery(theme.breakpoints.only('md'));
  const isLg = useMediaQuery(theme.breakpoints.only('lg'));
  const isXl = useMediaQuery(theme.breakpoints.only('xl'));
  
  // Determine current screen size
  const screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 
    isXs ? 'xs' : 
    isSm ? 'sm' : 
    isMd ? 'md' : 
    isLg ? 'lg' : 'xl';
  
  // Orientation detection
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  
  // Touch device detection
  const [touchDevice, setTouchDevice] = useState(false);
  
  useEffect(() => {
    // Update orientation
    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };
    
    // Update touch device detection
    const updateTouchDevice = () => {
      setTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    
    // Initial setup
    updateOrientation();
    updateTouchDevice();
    
    // Listen for orientation changes
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);
    
    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    isSmallScreen,
    screenSize,
    orientation,
    touchDevice,
  };
};

/**
 * Hook for responsive values based on breakpoints
 */
export const useResponsiveValue = <T>(values: {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
}): T | undefined => {
  const { screenSize } = useResponsive();
  
  // Return the value for current screen size, falling back to smaller sizes
  return values[screenSize] || 
         (screenSize === 'xl' && (values.lg || values.md || values.sm || values.xs)) ||
         (screenSize === 'lg' && (values.md || values.sm || values.xs)) ||
         (screenSize === 'md' && (values.sm || values.xs)) ||
         (screenSize === 'sm' && values.xs) ||
         values.xs;
};

/**
 * Hook for responsive spacing
 */
export const useResponsiveSpacing = () => {
  const { isMobile, isTablet } = useResponsive();
  
  return {
    // Container padding
    containerPadding: isMobile ? 1 : isTablet ? 2 : 3,
    
    // Grid spacing
    gridSpacing: isMobile ? 2 : 3,
    
    // Card padding
    cardPadding: isMobile ? 2 : 3,
    
    // Section margins
    sectionMargin: isMobile ? 3 : 4,
    
    // Button heights
    buttonHeight: isMobile ? 48 : 40,
    
    // Touch target size
    touchTargetSize: isMobile ? 48 : 40,
    
    // Icon sizes
    iconSize: isMobile ? 'medium' : 'small',
    
    // Typography variants
    headerVariant: isMobile ? 'h5' : 'h4',
    subheaderVariant: isMobile ? 'h6' : 'h5',
    bodyVariant: isMobile ? 'body2' : 'body1',
  };
};

/**
 * Hook for responsive grid columns
 */
export const useResponsiveGrid = () => {
  const { screenSize } = useResponsive();
  
  const getColumns = (config: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  }) => {
    return config[screenSize] || config.xs || 12;
  };
  
  return { getColumns };
};

/**
 * Hook for mobile-specific behaviors
 */
export const useMobileBehavior = () => {
  const { isMobile, touchDevice } = useResponsive();
  
  return {
    // Whether to show hover effects
    showHoverEffects: !isMobile && !touchDevice,
    
    // Whether to auto-focus inputs
    autoFocusInputs: !isMobile,
    
    // Whether to show tooltips
    showTooltips: !isMobile,
    
    // Whether to use swipe gestures
    enableSwipeGestures: isMobile && touchDevice,
    
    // Whether to show abbreviated text
    useAbbreviatedText: isMobile,
    
    // Whether to use bottom sheets instead of modals
    useBottomSheets: isMobile,
    
    // Whether to stack form elements vertically
    stackFormElements: isMobile,
  };
};

export default useResponsive;