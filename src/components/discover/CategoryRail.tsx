import { ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CategoryChip } from '../ui/CategoryChip';
import { Pill } from '../ui/Pill';
import { Skeleton } from '../ui/Skeleton';
import type { Category } from '@/features/sessions/types';

/** Ligne de pastilles de catégories, défilante et colorée. */
export function CategoryRail({ categories, selected, onChange }: { categories: Category[] | undefined; selected: number[]; onChange: (ids: number[]) => void }) {
  const { t } = useTranslation();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4">
      <Pill label={t('discover.allCategories')} selected={selected.length === 0} onPress={() => onChange([])} />
      {categories
        ? categories.map((c) => (
            <CategoryChip
              key={c.id}
              category={c}
              selected={selected.includes(c.id)}
              onPress={() => onChange(selected.includes(c.id) ? selected.filter((x) => x !== c.id) : [...selected, c.id])}
            />
          ))
        : (['orange', 'jaune', 'turquoise', 'encre'] as const).map((tint) => <Skeleton key={tint} tint={tint} className="h-12 w-28 rounded-pill" />)}
    </ScrollView>
  );
}
