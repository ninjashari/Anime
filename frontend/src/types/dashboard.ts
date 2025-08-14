/**
 * Dashboard types for API responses and component props
 */

export interface TimeSpent {
  minutes: number;
  hours: number;
  days: number;
}

export interface ScoreDistributionItem {
  score: number;
  count: number;
}

export interface StatusBreakdown {
  watching: number;
  completed: number;
  on_hold: number;
  dropped: number;
  plan_to_watch: number;
}

export interface DashboardStats {
  total_anime_count: number;
  total_episodes_watched: number;
  time_spent_watching: TimeSpent;
  time_to_complete_planned: TimeSpent;
  mean_score: number | null;
  score_distribution: ScoreDistributionItem[];
  status_breakdown: StatusBreakdown;
}

export interface DashboardResponse {
  success: boolean;
  data: DashboardStats;
  message: string;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  loading?: boolean;
}

export interface ScoreDistributionChartProps {
  data: ScoreDistributionItem[];
  loading?: boolean;
}