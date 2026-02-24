import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { API } from '../api/endpoints';
import type { ClientProfile, ClientUpdateRequest, ClientBalance, GroupMemberItem, ClientScheduleSummary } from '../types/client';
import type { ClientTransactionItem } from '../types/transaction';
import type { ClientSMSSubmitRequest, SubmitResponse } from '../types/transaction';
import type { PayoutRequest, PayoutResponse, ClientPayoutItem } from '../types/payout';
import type { RotationScheduleResponse } from '../types/collector';
import type { PaginatedResponse } from '../types/common';
import type { ClientAnalytics } from '../types/analytics';

export function useClientBalance() {
  return useQuery<ClientBalance>({
    queryKey: ['client-balance'],
    queryFn: async () => {
      const { data } = await api.get(API.CLIENTS.BALANCE);
      return data;
    },
  });
}

export function useClientProfile() {
  return useQuery<ClientProfile>({
    queryKey: ['client-profile'],
    queryFn: async () => {
      const { data } = await api.get(API.CLIENTS.ME);
      return data;
    },
  });
}

export function useUpdateClientProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ClientUpdateRequest) => {
      const { data } = await api.patch(API.CLIENTS.ME, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-profile'] });
    },
  });
}

export function useGroupMembers() {
  return useQuery<GroupMemberItem[]>({
    queryKey: ['group-members'],
    queryFn: async () => {
      const { data } = await api.get(API.CLIENTS.GROUP);
      return data;
    },
  });
}

export function useMemberHistory(memberId: string) {
  return useInfiniteQuery<PaginatedResponse<ClientTransactionItem>>({
    queryKey: ['member-history', memberId],
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get(API.CLIENTS.MEMBER_HISTORY(memberId), {
        params: { skip: pageParam, limit: 20 },
      });
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.skip + lastPage.limit < lastPage.total
        ? lastPage.skip + lastPage.limit
        : undefined,
    enabled: !!memberId,
  });
}

export function useMyTransactions(status?: string) {
  return useInfiniteQuery<PaginatedResponse<ClientTransactionItem>>({
    queryKey: ['my-transactions', status ?? 'all'],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, unknown> = { skip: pageParam, limit: 20 };
      if (status) params.status = status;
      const { data } = await api.get(API.TRANSACTIONS.MY_HISTORY, { params });
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.skip + lastPage.limit < lastPage.total
        ? lastPage.skip + lastPage.limit
        : undefined,
  });
}

export function useClientSubmitSms() {
  const queryClient = useQueryClient();
  return useMutation<SubmitResponse, Error, ClientSMSSubmitRequest>({
    mutationFn: async (payload) => {
      const { data } = await api.post(API.TRANSACTIONS.CLIENT_SUBMIT_SMS, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['client-balance'] });
      queryClient.invalidateQueries({ queryKey: ['client-analytics'] });
    },
  });
}

export function useClientSubmitScreenshot() {
  const queryClient = useQueryClient();
  return useMutation<SubmitResponse, Error, { amount: number; screenshot: File }>({
    mutationFn: async ({ amount, screenshot }) => {
      const formData = new FormData();
      formData.append('amount', amount.toString());
      formData.append('screenshot', screenshot);
      const { data } = await api.post(API.TRANSACTIONS.CLIENT_SUBMIT_SCREENSHOT, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['client-balance'] });
      queryClient.invalidateQueries({ queryKey: ['client-analytics'] });
    },
  });
}

export function useRequestPayout() {
  const queryClient = useQueryClient();
  return useMutation<PayoutResponse, Error, PayoutRequest>({
    mutationFn: async (payload) => {
      const { data } = await api.post(API.PAYOUTS.REQUEST, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['client-balance'] });
    },
  });
}

export function useMyPayouts() {
  return useInfiniteQuery<PaginatedResponse<ClientPayoutItem>>({
    queryKey: ['my-payouts'],
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get(API.PAYOUTS.MY_PAYOUTS, {
        params: { skip: pageParam, limit: 20 },
      });
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.skip + lastPage.limit < lastPage.total
        ? lastPage.skip + lastPage.limit
        : undefined,
  });
}

export function useMySchedule() {
  return useQuery<ClientScheduleSummary>({
    queryKey: ['client-schedule'],
    queryFn: async () => {
      const { data } = await api.get(API.CLIENTS.SCHEDULE);
      return data;
    },
  });
}

export function useGroupSchedule() {
  return useQuery<RotationScheduleResponse>({
    queryKey: ['group-schedule'],
    queryFn: async () => {
      const { data } = await api.get(API.CLIENTS.GROUP_SCHEDULE);
      return data;
    },
    retry: false,
  });
}

export function useClientAnalytics() {
  return useQuery<ClientAnalytics>({
    queryKey: ['client-analytics'],
    queryFn: async () => {
      const { data } = await api.get(API.CLIENTS.ANALYTICS);
      return data;
    },
  });
}
