import React from 'react';
import { Typography, Box, Paper } from '@mui/material';

const Dashboard: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1">
          Welcome to your anime dashboard! This page will show your statistics and recent activity.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Dashboard functionality will be implemented in a future task.
        </Typography>
      </Paper>
    </Box>
  );
};

export default Dashboard;