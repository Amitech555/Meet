import { rpc } from '@/lib/rpc';
import type { PersonPreview } from '@/features/sessions/types';

export type HostDashboard = {
  days: number;
  sessions_total: number;
  sessions_upcoming: number;
  fill_rate: number | null;
  attendance_rate: number | null;
  unique_players: number;
  thumbs_up: number;
  weekly: { week: string; sessions: number; fill: number | null }[];
  regulars: (PersonPreview & { count: number })[];
  recent: { id: string; title: string; starts_at: string; status: string; places_taken: number; max_players: number; attended: number; no_show: number }[];
};

export const hostDashboard = (days = 90) => rpc<'host_dashboard', HostDashboard>('host_dashboard', { p_days: days });
