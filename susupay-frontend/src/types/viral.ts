export interface ReferralStats {
  referral_code: string;
  total_referrals: number;
  referral_names: string[];
}

export interface AchievementItem {
  achievement_type: string;
  title: string;
  description: string;
  icon: string;
  earned_at: string | null;
  earned: boolean;
}

export interface AchievementListResponse {
  earned: AchievementItem[];
  available: AchievementItem[];
  total_earned: number;
  total_available: number;
}

export interface SavingsGoal {
  id: string;
  title: string;
  target_amount: string;
  current_amount: string;
  progress_percent: number;
  target_date: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SavingsGoalCreate {
  title: string;
  target_amount: number;
  target_date?: string;
}

export interface LeaderboardEntry {
  rank: number;
  client_id: string;
  full_name: string;
  streak: number;
  total_deposits: string;
  is_current_user: boolean;
}

export interface LeaderboardResponse {
  period_label: string;
  entries: LeaderboardEntry[];
  my_rank: number | null;
}

export interface ShareLinkResponse {
  invite_url: string;
  whatsapp_url: string;
  message: string;
}
