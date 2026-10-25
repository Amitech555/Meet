import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { cityStats, listReports, resolveReport, unban, type AdminAction, type ReportStatus } from './api';
import { toast } from '@/stores/toast';
import { errorMessage } from '@/lib/errors';

export function useReports(status: ReportStatus) {
  return useQuery({ queryKey: ['admin', 'reports', status], queryFn: () => listReports(status) });
}

export function useCityStats() {
  return useQuery({ queryKey: ['admin', 'stats'], queryFn: cityStats });
}

export function useResolveReport() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: AdminAction }) => resolveReport(id, action, action === 'none' ? 'dismissed' : 'actioned'),
    onSuccess: () => toast(t('admin.done')),
    onError: (e) => toast(errorMessage(e, t), 'error'),
    onSettled: () => void qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useUnban() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: unban,
    onError: (e) => toast(errorMessage(e, t), 'error'),
    onSettled: () => void qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}
