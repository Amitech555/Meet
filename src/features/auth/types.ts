import type { SessionSummary } from '@/features/sessions/types';

export type ProfileTag = { tag: 'punctual' | 'fairplay' | 'friendly' | 'skilled' | 'organized'; count: number };

export type PublicProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  city: { id: number; name: string } | null;
  member_since: string;
  verified: boolean;
  reliability: number | null;
  sessions_played: number;
  sessions_hosted: number;
  thumbs_up: number;
  review_count: number;
  tags: ProfileTag[];
  interests: { id: number; slug: string; name_fr: string; name_en: string; icon: string; tint: string; level: string }[];
  upcoming_hosted: SessionSummary[];
  is_me: boolean;
  is_blocked: boolean;
  is_following: boolean;
};

export type Me = PublicProfile & {
  locale: 'fr' | 'en';
  city_id: number | null;
  profile_complete: boolean;
  terms_version: string | null;
  interest_ids: number[];
  unread_notifications: number;
};
