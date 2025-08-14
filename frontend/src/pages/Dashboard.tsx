/**
 * Dashboard page component with comprehensive anime statistics
 */
import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Grid,
  Alert,
  Snackbar,
  Container,
  useTheme
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  PlayArrow as PlayArrowIcon,
  Schedule as ScheduleIcon,
  Star as StarIcon,
  Assessment as AssessmentIcon,
  Tv as TvIcon
} from '@mui/icons-material';

import StatCard from '../components/dashboard/StatCard';
import ScoreDistributionChart from '../components/dashboard/ScoreDistributionChart';
import { dashboardApi } from '../services/dashboardApi';
import { DashboardStats } from '../types/dashboard';

const Dashboard: React.FC = () => {
  const theme = useTheme();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await dashboardApi.getStats();
      setStats(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseError = () => {
    setError(null);
  };

  const formatTimeSpent = (timeSpent: { minutes: number; hours: number; days: number }) => {
    if (timeSpent.days > 0) {
      return `${timeSpent.days} day${timeSpent.days !== 1 ? 's' : ''}`;
    } else if (timeSpent.hours > 0) {
      return `${timeSpent.hours} hour${timeSpent.hours !== 1 ? 's' : ''}`;
    } else {
      return `${timeSpent.minutes} min`;
    }
  };

  const formatTimeSpentSubtitle = (timeSpent: { minutes: number; hours: number; days: number }) => {
    if (timeSpent.days > 0) {
      return `${timeSpent.hours} hours, ${timeSpent.minutes} minutes`;
    } else if (timeSpent.hours > 0) {
      return `${timeSpent.minutes} minutes`;
    } else {
      return '';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box mb={4}>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{ 
            fontWeight: 'bold',
            color: 'primary.main',
            mb: 1
          }}
        >
          Dashboard
        </Typography>
        <Typography 
          variant="subtitle1" 
          color="text.secondary"
          sx={{ mb: 3 }}
        >
          Your anime watching statistics and progress overview
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Statistics Cards */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard
            title="Total Anime"
            value={stats?.total_anime_count ?? 0}
            icon={<TvIcon />}
            loading={loading}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard
            title="Episodes Watched"
            value={stats?.total_episodes_watched ?? 0}
            icon={<PlayArrowIcon />}
            loading={loading}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard
            title="Time Spent"
            value={stats ? formatTimeSpent(stats.time_spent_watching) : '0 min'}
            subtitle={stats ? formatTimeSpentSubtitle(stats.time_spent_watching) : undefined}
            icon={<ScheduleIcon />}
            loading={loading}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard
            title="Time to Complete"
            value={stats ? formatTimeSpent(stats.time_to_complete_planned) : '0 min'}
            subtitle={stats ? formatTimeSpentSubtitle(stats.time_to_complete_planned) : undefined}
            icon={<TrendingUpIcon />}
            loading={loading}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard
            title="Mean Score"
            value={stats?.mean_score ? stats.mean_score.toFixed(1) : 'N/A'}
            subtitle={stats?.mean_score ? 'out of 10' : 'No ratings yet'}
            icon={<StarIcon />}
            loading={loading}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard
            title="Completed"
            value={stats?.status_breakdown.completed ?? 0}
            subtitle="anime finished"
            icon={<AssessmentIcon />}
            loading={loading}
          />
        </Grid>

        {/* Score Distribution Chart */}
        <Grid item xs={12} lg={8}>
          <ScoreDistributionChart
            data={stats?.score_distribution ?? []}
            loading={loading}
          />
        </Grid>

        {/* Status Breakdown */}
        <Grid item xs={12} lg={4}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <StatCard
                title="Currently Watching"
                value={stats?.status_breakdown.watching ?? 0}
                loading={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <StatCard
                title="Plan to Watch"
                value={stats?.status_breakdown.plan_to_watch ?? 0}
                loading={loading}
              />
            </Grid>
            <Grid item xs={6}>
              <StatCard
                title="On Hold"
                value={stats?.status_breakdown.on_hold ?? 0}
                loading={loading}
              />
            </Grid>
            <Grid item xs={6}>
              <StatCard
                title="Dropped"
                value={stats?.status_breakdown.dropped ?? 0}
                loading={loading}
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseError} 
          severity="error" 
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Dashboard;