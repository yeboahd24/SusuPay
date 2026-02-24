import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { API } from '../api/endpoints';
import type { CollectorProfile, CollectorUpdateRequest, CollectorDashboard, RotationScheduleResponse, RotationOrderRequest } from '../types/collector';
import type { ClientListItem, ClientUpdateRequest } from '../types/client';
import type { CollectorAnalytics } from '../types/analytics';
import type { PayoutListItem, PayoutDeclineRequest } from '../types/payout';

export function useDashboard() {
  return useQuery<CollectorDashboard>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get(API.COLLECTORS.DASHBOARD);
      return data;
    },
  });
}

export function useCollectorProfile() {
  return useQuery<CollectorProfile>({
    queryKey: ['collector-profile'],
    queryFn: async () => {
      const { data } = await api.get(API.COLLECTORS.ME);
      return data;
    },
  });
}

export function useClients() {
  return useQuery<ClientListItem[]>({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data } = await api.get(API.COLLECTORS.CLIENTS);
      return data;
    },
  });
}

export function useClient(clientId: string) {
  return useQuery<ClientListItem>({
    queryKey: ['clients', clientId],
    queryFn: async () => {
      const { data } = await api.get(API.COLLECTORS.CLIENT(clientId));
      return data;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CollectorUpdateRequest) => {
      const { data } = await api.patch(API.COLLECTORS.ME, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collector-profile'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, payload }: { clientId: string; payload: ClientUpdateRequest }) => {
      const { data } = await api.patch(API.COLLECTORS.CLIENT(clientId), payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useDeactivateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string) => {
      const { data } = await api.delete(API.COLLECTORS.CLIENT(clientId));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useSchedule() {
  return useQuery<RotationScheduleResponse>({
    queryKey: ['collector-schedule'],
    queryFn: async () => {
      const { data } = await api.get(API.COLLECTORS.SCHEDULE);
      return data;
    },
    retry: false,
  });
}

export function useSetRotationOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RotationOrderRequest) => {
      const { data } = await api.put(API.COLLECTORS.SCHEDULE, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collector-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCollectorPayouts(status?: string) {
  return useQuery<{ items: PayoutListItem[]; total: number }>({
    queryKey: ['collector-payouts', status],
    queryFn: async () => {
      const { data } = await api.get(API.PAYOUTS.LIST, {
        params: { ...(status && status !== 'ALL' ? { status } : {}), limit: 100 },
      });
      return data;
    },
  });
}

export function useApprovePayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payoutId: string) => {
      const { data } = await api.post(API.PAYOUTS.APPROVE(payoutId));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collector-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeclinePayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ payoutId, payload }: { payoutId: string; payload: PayoutDeclineRequest }) => {
      const { data } = await api.post(API.PAYOUTS.DECLINE(payoutId), payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collector-payouts'] });
    },
  });
}

export function useCompletePayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payoutId: string) => {
      const { data } = await api.post(API.PAYOUTS.COMPLETE(payoutId));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collector-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCollectorAnalytics() {
  return useQuery<CollectorAnalytics>({
    queryKey: ['collector-analytics'],
    queryFn: async () => {
      const { data } = await api.get(API.COLLECTORS.ANALYTICS);
      return data;
    },
  });
}
