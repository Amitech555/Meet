import { dayKind } from '@/lib/time';
import { isFillingFast, type Category, type SessionSummary } from './types';

export type FeedSections = { tonight: SessionSummary[]; fillingFast: SessionSummary[]; forYou: SessionSummary[] };

/** Sections du feed dérivées de la première page (une seule requête au chargement). */
export function deriveSections(rows: SessionSummary[], interests: number[], categories: Category[] | undefined, now: Date = new Date()): FeedSections {
  const parentOf = new Map(categories?.map((c) => [c.id, c.parent_id ?? c.id]));
  const open = rows.filter((s) => s.my_status !== 'joined');
  const tonight = open.filter((s) => {
    const k = dayKind(s.starts_at, now);
    return k === 'tonight' || k === 'today';
  });
  const fillingFast = open.filter((s) => isFillingFast(s)).slice(0, 8);
  const interestSet = new Set(interests);
  const forYou = interests.length
    ? open.filter((s) => interestSet.has(s.category.id) || interestSet.has(parentOf.get(s.category.id) ?? -1)).slice(0, 8)
    : [];
  return { tonight: tonight.slice(0, 8), fillingFast, forYou };
}
