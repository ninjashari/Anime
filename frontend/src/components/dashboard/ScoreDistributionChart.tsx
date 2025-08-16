/**
 * ScoreDistributionChart component for displaying score distribution bar chart
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
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { ScoreDistributionChartProps } from '../../types/dashboard';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const ScoreDistributionChart: React.FC<ScoreDistributionChartProps> = ({
  data,
  loading = false
}) => {
  const theme = useTheme();

  if (loading) {
    return (
      <Card sx={{ height: '100%', minHeight: 400 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Score Distribution
          </Typography>
          <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Skeleton variant="rectangular" width="100%" height="100%" />
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const chartData = {
    labels: data.map(item => item.score.toString()),
    datasets: [
      {
        label: 'Number of Anime',
        data: data.map(item => item.count),
        backgroundColor: theme.palette.primary.main,
        borderColor: theme.palette.primary.dark,
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      }
    ]
  };

  // Chart options
  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: false
      },
      tooltip: {
        callbacks: {
          title: (context) => {
            return `Score: ${context[0].label}`;
          },
          label: (context) => {
            const count = context.parsed.y;
            return `${count} anime${count !== 1 ? 's' : ''}`;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Score',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 12
          }
        }
      },
      y: {
        title: {
          display: true,
          text: 'Number of Anime',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: {
            size: 12
          }
        },
        grid: {
          color: theme.palette.divider,
          lineWidth: 1
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart'
    }
  };

  // Check if there's any data to display
  const hasData = data.some(item => item.count > 0);

  return (
    <Card sx={{ height: '100%', minHeight: 400 }}>
      <CardContent>
        <Typography 
          variant="h6" 
          gutterBottom
          sx={{ fontWeight: 600, mb: 2 }}
        >
          Score Distribution
        </Typography>
        
        {hasData ? (
          <Box sx={{ height: 300, position: 'relative' }}>
            <Bar data={chartData} options={options} />
          </Box>
        ) : (
          <Box 
            sx={{ 
              height: 300, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexDirection: 'column',
              color: 'text.secondary'
            }}
          >
            <Typography variant="body1" align="center">
              No scored anime yet
            </Typography>
            <Typography variant="body2" align="center" sx={{ mt: 1 }}>
              Start rating your anime to see the distribution!
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ScoreDistributionChart;