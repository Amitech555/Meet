import type { Category, PersonPreview, SessionSummary } from '@/features/sessions/types';

export type GroupCard = {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  rhythm_label: string | null;
  visibility: 'public' | 'private';
  category: Pick<Category, 'id' | 'slug' | 'name_fr' | 'name_en' | 'icon' | 'tint'>;
  member_count: number;
  members_preview: PersonPreview[];
  my_role: 'admin' | 'member' | null;
  next_session: SessionSummary | null;
};

export type GroupDetail = GroupCard & {
  invite_code: string | null;
  upcoming: SessionSummary[];
  locked: boolean;
  is_following: boolean;
};
