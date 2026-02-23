import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { API } from '../api/endpoints';
import type {
  TransactionFeedItem,
  TransactionStatus,
  SMSSubmitRequest,
  SubmitResponse,
  TransactionActionResponse,
  QueryRequest,
  RejectRequest,
} from '../types/transaction';
import type { PaginatedResponse } from '../types/common';

export function useTransactionFeed(limit = 5) {
  return useQuery<PaginatedResponse<TransactionFeedItem>>({
    queryKey: ['feed'],
    queryFn: async () => {
      const { data } = await api.get(API.TRANSACTIONS.FEED, {
        params: { skip: 0, limit },
      });
      return data;
    },
  });
}

export function useTransactions(status?: TransactionStatus) {
  return useInfiniteQuery<PaginatedResponse<TransactionFeedItem>>({
    queryKey: ['transactions', status ?? 'all'],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, unknown> = { skip: pageParam, limit: 20 };
      if (status) params.status = status;
      const { data } = await api.get(API.TRANSACTIONS.LIST, { params });
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.skip + lastPage.limit < lastPage.total
        ? lastPage.skip + lastPage.limit
        : undefined,
  });
}

export function useSubmitSms() {
  const queryClient = useQueryClient();
  return useMutation<SubmitResponse, Error, SMSSubmitRequest>({
    mutationFn: async (payload) => {
      const { data } = await api.post(API.TRANSACTIONS.SUBMIT_SMS, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useConfirmTransaction() {
  const queryClient = useQueryClient();
  return useMutation<TransactionActionResponse, Error, string>({
    mutationFn: async (transactionId) => {
      const { data } = await api.post(API.TRANSACTIONS.CONFIRM(transactionId), {});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useQueryTransaction() {
  const queryClient = useQueryClient();
  return useMutation<TransactionActionResponse, Error, { id: string; payload: QueryRequest }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.post(API.TRANSACTIONS.QUERY(id), payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useRejectTransaction() {
  const queryClient = useQueryClient();
  return useMutation<TransactionActionResponse, Error, { id: string; payload: RejectRequest }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.post(API.TRANSACTIONS.REJECT(id), payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
