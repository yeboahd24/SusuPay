import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { API } from '../api/endpoints';
import type { Announcement, AnnouncementCreate, AnnouncementUpdate, CollectorRatingSummary, RatingCreate } from '../types/announcement';

// ─── Collector: announcements CRUD ──────────────────────────────────────────

export function useAnnouncements() {
  return useQuery<Announcement[]>({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data } = await api.get(API.ANNOUNCEMENTS.LIST);
      return data;
    },
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AnnouncementCreate) => {
      const { data } = await api.post(API.ANNOUNCEMENTS.CREATE, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: AnnouncementUpdate }) => {
      const { data } = await api.patch(API.ANNOUNCEMENTS.UPDATE(id), payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(API.ANNOUNCEMENTS.DELETE(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

// ─── Client: announcement feed ──────────────────────────────────────────────

export function useAnnouncementFeed() {
  return useQuery<Announcement[]>({
    queryKey: ['announcement-feed'],
    queryFn: async () => {
      const { data } = await api.get(API.ANNOUNCEMENTS.FEED);
      return data;
    },
  });
}

// ─── Client: rate collector ─────────────────────────────────────────────────

export function useRateCollector() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RatingCreate) => {
      const { data } = await api.post(API.ANNOUNCEMENTS.RATE, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collector-ratings'] });
    },
  });
}

export function useCollectorRatings() {
  return useQuery<CollectorRatingSummary>({
    queryKey: ['collector-ratings'],
    queryFn: async () => {
      const { data } = await api.get(API.ANNOUNCEMENTS.RATINGS);
      return data;
    },
  });
}
