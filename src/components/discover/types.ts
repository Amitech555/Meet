import type { SessionSummary } from '@/features/sessions/types';
import type { LatLng } from '@/lib/geo';

export type SessionMapProps = {
  sessions: SessionSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpen: (s: SessionSummary) => void;
  onJoin: (s: SessionSummary) => void;
  currentUserId: string | null;
  joiningId?: string;
  center: LatLng;
};
