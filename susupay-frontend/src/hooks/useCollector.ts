import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { API } from '../api/endpoints';
import type { CollectorProfile, CollectorUpdateRequest, CollectorDashboard } from '../types/collector';
import type { ClientListItem, ClientUpdateRequest } from '../types/client';

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
