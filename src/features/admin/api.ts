import { rpc } from '@/lib/rpc';
import type { PersonPreview } from '@/features/sessions/types';

export type ReportStatus = 'open' | 'reviewed' | 'actioned' | 'dismissed';
export type AdminAction = 'none' | 'ban_user' | 'cancel_session' | 'delete_message' | 'hide_group';

export type AdminReport = {
  id: number;
  target_type: 'user' | 'session' | 'group' | 'message';
  target_id: string;
  reason: 'spam' | 'harassment' | 'unsafe' | 'fake' | 'dating' | 'other';
  details: string | null;
  status: ReportStatus;
  created_at: string;
  reporter: PersonPreview | null;
  reports_on_target: number;
  target:
    | (PersonPreview & { is_banned: boolean })
    | { title: string; status: string; starts_at: string; host: PersonPreview | null }
    | { name: string; visibility: string; owner: PersonPreview | null }
    | { body: string; deleted: boolean; author: PersonPreview | null }
    | null;
};

export type CityStats = {
  totals: { users: number; banned: number; groups: number; open_reports: number; sessions_upcoming: number };
  weekly: { week: string; city: string; sessions_published: number; active_hosts: number; fill_rate_pct: number | null; attendance_rate_pct: number | null }[];
  cohorts: { cohort: string; signups: number; activation_48h_pct: number | null; second_session_14d_pct: number | null }[];
};

export const listReports = (status: ReportStatus) => rpc<'admin_list_reports', AdminReport[]>('admin_list_reports', { p_status: status, p_limit: 100 });
export const resolveReport = (id: number, action: AdminAction, status: ReportStatus) =>
  rpc('admin_resolve_report', { p_report_id: id, p_action: action, p_status: status });
export const unban = (userId: string) => rpc('admin_unban', { p_user_id: userId });
export const cityStats = () => rpc<'admin_city_stats', CityStats>('admin_city_stats');

/** Actions proposées selon la cible du signalement. */
export function actionsFor(target: AdminReport['target_type']): AdminAction[] {
  switch (target) {
    case 'user':
      return ['ban_user', 'none'];
    case 'session':
      return ['cancel_session', 'ban_user', 'none'];
    case 'message':
      return ['delete_message', 'ban_user', 'none'];
    case 'group':
      return ['hide_group', 'ban_user', 'none'];
  }
}
