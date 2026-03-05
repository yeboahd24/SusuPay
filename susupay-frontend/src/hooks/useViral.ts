import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { API } from '../api/endpoints';
import type {
  ReferralStats,
  AchievementListResponse,
  SavingsGoal,
  SavingsGoalCreate,
  LeaderboardResponse,
  ShareLinkResponse,
} from '../types/viral';

export function useReferrals() {
  return useQuery<ReferralStats>({
    queryKey: ['referrals'],
    queryFn: async () => {
      const { data } = await api.get(API.VIRAL.REFERRALS);
      return data;
    },
  });
}

export function useShareLink() {
  return useQuery<ShareLinkResponse>({
    queryKey: ['share-link'],
    queryFn: async () => {
      const { data } = await api.get(API.VIRAL.SHARE_LINK);
      return data;
    },
  });
}

export function useAchievements() {
  return useQuery<AchievementListResponse>({
    queryKey: ['achievements'],
    queryFn: async () => {
      const { data } = await api.get(API.VIRAL.ACHIEVEMENTS);
      return data;
    },
  });
}

export function useSavingsGoals() {
  return useQuery<SavingsGoal[]>({
    queryKey: ['savings-goals'],
    queryFn: async () => {
      const { data } = await api.get(API.VIRAL.GOALS);
      return data;
    },
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation<SavingsGoal, Error, SavingsGoalCreate>({
    mutationFn: async (payload) => {
      const { data } = await api.post(API.VIRAL.GOALS, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (goalId) => {
      await api.delete(API.VIRAL.GOAL(goalId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
    },
  });
}

export function useLeaderboard() {
  return useQuery<LeaderboardResponse>({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data } = await api.get(API.VIRAL.LEADERBOARD);
      return data;
    },
  });
}
