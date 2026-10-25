import { useQuery } from '@tanstack/react-query';
import { useUserId } from '@/stores/auth';
import { hostDashboard } from './api';

export function useHostDashboard(days = 90) {
  const uid = useUserId();
  return useQuery({ queryKey: ['host-dashboard', uid, days], enabled: !!uid, queryFn: () => hostDashboard(days) });
}
