import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, SectionHeader } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button, IconButton } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { CategoryChip } from '@/components/ui/CategoryChip';
import { PriceBadge, SpotsBadge } from '@/components/ui/PriceBadge';
import { Avatar, AvatarStack } from '@/components/ui/Avatar';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SessionCardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { Sheet } from '@/components/ui/Sheet';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Icons } from '@/components/ui/icons';
import { SessionCard } from '@/components/session/SessionCard';
import { GeneratedCover } from '@/components/session/GeneratedCover';
import { JoinButton, type JoinState } from '@/components/session/JoinButton';
import { demoSessions } from '@/features/sessions/fixtures';
import { categoryTints, fontSizes, themes } from '@design/tokens';
import { useTheme } from '@/design/theme';
import { toast } from '@/stores/toast';

const demoCategories = [
  { icon: 'running', tint: 'orange', name_fr: 'Course & marche', name_en: 'Running' },
  { icon: 'basketball', tint: 'jaune', name_fr: 'Basket', name_en: 'Basketball' },
  { icon: 'golf', tint: 'mousse', name_fr: 'Golf', name_en: 'Golf' },
  { icon: 'horse-riding', tint: 'terracotta', name_fr: 'Équitation', name_en: 'Horse riding' },
  { icon: 'racket', tint: 'turquoise', name_fr: 'Raquette', name_en: 'Racket' },
  { icon: 'board-games', tint: 'encre', name_fr: 'Jeux de société', name_en: 'Board games' },
  { icon: 'outdoors', tint: 'sapin', name_fr: 'Plein air', name_en: 'Outdoors' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <Text variant="label" tone="soft">
        {title}
      </Text>
      {children}
    </View>
  );
}

/** Écran caché : tous les composants et leurs états, en clair et en sombre. */
export default function Styleguide() {
  const { t } = useTranslation();
  const { scheme, toggle, colors } = useTheme();
  const [selected, setSelected] = useState<number[]>([1]);
  const [sheet, setSheet] = useState(false);
  const [spots, setSpots] = useState(3);
  const [cards, setCards] = useState(demoSessions);

  const join = (id: string) =>
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, my_status: c.joined_count < c.max_players ? 'joined' : 'waitlist', joined_count: Math.min(c.max_players, c.joined_count + 1) } : c)));

  return (
    <Screen scroll>
      <View className="flex-row items-center justify-between">
        <IconButton icon={Icons.ArrowLeft} label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <Text variant="display">{t('styleguide.title')}</Text>
        <IconButton icon={scheme === 'dark' ? Icons.Sun : Icons.Moon} label={t('styleguide.toggleTheme')} onPress={toggle} />
      </View>

      <Section title="Couleurs">
        <View className="flex-row flex-wrap gap-2">
          {(Object.keys(themes.light) as (keyof typeof themes.light)[])
            .filter((k) => k !== 'overlay')
            .map((k) => (
              <View key={k} className="w-[76px] gap-1">
                <View className="h-12 rounded-field border border-line" style={{ backgroundColor: colors[k] }} />
                <Text variant="caption" tone="soft" numberOfLines={1} className="text-xs">
                  {k}
                </Text>
              </View>
            ))}
        </View>
        <View className="flex-row flex-wrap gap-2">
          {Object.entries(categoryTints).map(([k, v]) => (
            <View key={k} className="h-12 w-[76px] justify-end rounded-field p-2" style={{ backgroundColor: v.bg }}>
              <Text variant="caption" tone="inherit" className="text-xs font-bold" style={{ color: v.fg }}>
                {k}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Typographie">
        <Text variant="hero" tabular>18:30</Text>
        <Text variant="display">{"T'es partant ?"}</Text>
        <Text variant="title">Il reste 2 places</Text>
        <Text variant="heading">Basket 3 contre 3 au parc La Fontaine</Text>
        <Text>Rien de prévu ce soir. Lance quelque chose ?</Text>
        <Text variant="caption" tone="soft">
          Échelle {Object.values(fontSizes).join(' / ')}
        </Text>
      </Section>

      <Section title="Boutons">
        <Button label={t('common.join')} size="lg" fullWidth />
        <View className="flex-row flex-wrap gap-2">
          <Button label={t('common.join')} />
          <Button label={t('common.waitlist')} variant="ink" />
          <Button label={t('common.joined')} variant="citron" icon={Icons.Check} />
          <Button label={t('common.share')} variant="outline" icon={Icons.ShareNetwork} />
          <Button label={t('common.cancel')} variant="ghost" />
          <Button label={t('session.cancelSession')} variant="danger" />
          <Button label={t('common.loading')} loading />
          <Button label={t('common.join')} disabled />
        </View>
        <View className="flex-row gap-2">
          <IconButton icon={Icons.Bell} label={t('discover.notifications')} badge />
          <IconButton icon={Icons.MagnifyingGlass} label="Recherche" />
          <IconButton icon={Icons.ShareNetwork} label={t('common.share')} variant="ink" />
        </View>
      </Section>

      <Section title="Bouton Rejoindre — états">
        {(['available', 'full', 'joined', 'waitlisted', 'hosting', 'closed'] as JoinState[]).map((s) => (
          <View key={s} className="flex-row items-center justify-between">
            <Text variant="caption" tone="soft">{s}</Text>
            <JoinButton state={s} onJoin={() => toast(t('session.joinedToast'), 'celebrate')} />
          </View>
        ))}
      </Section>

      <Section title="Pastilles">
        <View className="flex-row flex-wrap gap-2">
          {[t('days.tonight'), t('days.tomorrow'), t('days.weekend'), t('days.pick')].map((l, i) => (
            <Pill key={l} label={l} selected={selected.includes(i)} onPress={() => setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))} icon={i === 3 ? Icons.CalendarBlank : undefined} />
          ))}
          <Pill label="Montréal" trailingIcon={Icons.CaretDown} onPress={() => setSheet(true)} />
          <Pill label={t('levels.beginner')} size="sm" />
        </View>
        <View className="flex-row flex-wrap gap-2">
          {demoCategories.map((c, i) => (
            <CategoryChip key={c.icon} category={c} selected={i === 1} onPress={() => undefined} />
          ))}
        </View>
        <View className="flex-row flex-wrap gap-2">
          {demoCategories.slice(0, 4).map((c) => (
            <CategoryChip key={c.icon} category={c} size="sm" />
          ))}
        </View>
      </Section>

      <Section title="Badges">
        <View className="flex-row flex-wrap items-center gap-2">
          <PriceBadge cents={0} />
          <PriceBadge cents={1200} />
          <PriceBadge cents={1250} />
          <SpotsBadge left={2} />
          <SpotsBadge left={1} />
          <SpotsBadge left={7} />
          <SpotsBadge left={0} />
        </View>
      </Section>

      <Section title="Avatars">
        <View className="flex-row items-center gap-4">
          <Avatar person={{ id: 'a', display_name: 'Camille Tremblay', avatar_url: null }} size={56} />
          <AvatarStack people={demoSessions[0]!.participants_preview} total={9} />
          <AvatarStack people={demoSessions[1]!.participants_preview.slice(0, 2)} />
        </View>
      </Section>

      <Section title="Compteur animé">
        <View className="flex-row items-center gap-3">
          <AnimatedNumber value={spots} variant="display" />
          <Button label="−1" variant="outline" onPress={() => setSpots((s) => Math.max(0, s - 1))} />
          <Button label="+1" variant="outline" onPress={() => setSpots((s) => s + 1)} />
        </View>
      </Section>

      <Section title="Cartes de session">
        <SessionCard session={cards[1]!} variant="featured" onPress={() => undefined} onJoin={() => join(cards[1]!.id)} />
        {cards.map((s) => (
          <SessionCard key={s.id} session={s} onPress={() => undefined} onJoin={() => join(s.id)} />
        ))}
      </Section>

      <Section title="Couvertures générées">
        <View className="flex-row flex-wrap gap-2">
          {demoCategories.map((c, i) => (
            <View key={c.icon} className="w-[48%]">
              <GeneratedCover seed={`cover-${i}`} tint={c.tint} icon={c.icon} height={96} rounded={16} />
            </View>
          ))}
        </View>
      </Section>

      <Section title="Chargement">
        <SessionCardSkeleton index={0} />
        <SessionCardSkeleton index={1} />
        <Skeleton className="h-4 w-1/2" />
      </Section>

      <Section title="États vides et erreurs">
        <EmptyState title={t('discover.emptyTitle')} body={t('discover.emptyBody')} actionLabel={t('discover.emptyCta')} onAction={() => undefined} actionIcon={Icons.Plus} />
        <EmptyState title={t('groups.emptyMine')} variant={1} />
        <ErrorState message={t('errors.offline')} retryLabel={t('common.retry')} onRetry={() => toast(t('errors.offline'), 'error')} icon={Icons.WifiSlash} />
      </Section>

      <SectionHeader title={t('common.share')} action={<Button label="Toast" variant="outline" onPress={() => toast(t('session.joinedToast'), 'celebrate')} />} />

      <Sheet open={sheet} onClose={() => setSheet(false)} title={t('discover.changeCity')}>
        <View className="gap-2">
          <Pill label="Montréal" selected onPress={() => setSheet(false)} />
          <Pill label={`Québec · ${t('onboarding.comingSoon')}`} />
        </View>
      </Sheet>
    </Screen>
  );
}
