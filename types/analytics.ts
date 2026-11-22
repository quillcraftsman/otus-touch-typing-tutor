export type DailyMetricPoint = {
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
  bounces: number;
  bounceRate: number;
};

export type FunnelMetrics = {
  landingCtaClicks: number;
  registrations: number;
  trainerImpressions: number;
  subscriptionClicks: number;
  waitlistJoins: number;
  landingToRegisterRate: number;
  registerToTrainerRate: number;
  trainerToClickRate: number;
};