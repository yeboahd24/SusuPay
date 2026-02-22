import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export function useTransactionFeed() {
  return useQuery<TransactionFeedItem[]>({
    queryKey: ['feed'],
    queryFn: async () => {
      const { data } = await api.get(API.TRANSACTIONS.FEED);
      return data;
    },
  });
}

export function useTransactions(status?: TransactionStatus) {
  return useQuery<TransactionFeedItem[]>({
    queryKey: ['transactions', status ?? 'all'],
    queryFn: async () => {
      const params = status ? { status } : {};
      const { data } = await api.get(API.TRANSACTIONS.LIST, { params });
      return data;
    },
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
