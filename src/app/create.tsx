import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, type ScrollViewInstance } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { Button, IconButton } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { CategoryChip, categoryName } from '@/components/ui/CategoryChip';
import { TextField } from '@/components/ui/TextField';
import { Stepper } from '@/components/ui/Stepper';
import { PressableScale } from '@/components/ui/PressableScale';
import { ActivityIcon } from '@/components/ui/ActivityIcon';
import { Icons } from '@/components/ui/icons';
import { SessionCard } from '@/components/session/SessionCard';
import { MiniMap } from '@/components/session/MiniMap';
import { useCategories } from '@/features/catalog/hooks';
import { useMe } from '@/features/auth/hooks';
import { useSession } from '@/features/sessions/hooks';
import { createSession, fetchPastHosted } from '@/features/create/api';
import { defaultDraft, draftFromSession, stepOfError, validateDraft, type DraftStep, type Recurrence, type SessionDraft } from '@/features/create/draft';
import type { CancellationPolicy, SessionLevel, SessionSummary } from '@/features/sessions/types';
import { supabase } from '@/lib/supabase';
import { geocode, type Place } from '@/lib/geocode';
import { pickAndUpload } from '@/lib/upload';
import { dollarsToCents } from '@/lib/money';
import { formatDuration, formatShortDate, formatStartTime, nextDays, wallParts, zonedWallTimeToUtc } from '@/lib/time';
import { errorMessage } from '@/lib/errors';
import { useDebounced } from '@/lib/useDebounced';
import { track } from '@/lib/analytics';
import { toast } from '@/stores/toast';
import { useUserId } from '@/stores/auth';
import { tintFor } from '@design/tokens';
import { currentLocale } from '@/i18n';
import { cn } from '@/lib/cn';

const STEPS: DraftStep[] = ['what', 'when', 'where', 'details'];
const stepLabel = { what: 'create.stepWhat', when: 'create.stepWhen', where: 'create.stepWhere', details: 'create.stepDetails' } as const;
const TIMES = ['06:30', '09:00', '10:00', '12:00', '17:30', '18:30', '19:00', '20:00'];
const DURATIONS = [45, 60, 90, 120, 180];
const LEVELS: SessionLevel[] = ['all', 'beginner', 'intermediate', 'advanced'];
const POLICIES: CancellationPolicy[] = ['flexible', 'moderate', 'strict'];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text variant="label" tone="soft">
        {label}
      </Text>
      {children}
    </View>
  );
}

/** Créer une session en < 2 min : Quoi → Quand → Où → Détails, aperçu en direct. */
export default function Create() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const lang = currentLocale();
  const qc = useQueryClient();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const uid = useUserId();
  const me = useMe().data;
  const categories = useCategories();
  const source = useSession(from);
  const past = useQuery({ queryKey: ['past-hosted', uid], queryFn: fetchPastHosted, enabled: !!uid && !from });
  const adminGroups = useQuery({
    queryKey: ['admin-groups', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.from('group_members').select('group_id, groups(name)').eq('user_id', uid!).eq('role', 'admin');
      return (data ?? []).map((r) => ({ id: r.group_id, name: (r.groups as { name: string } | null)?.name ?? '' }));
    },
  });

  const [draft, setDraft] = useState<SessionDraft>(() => defaultDraft());
  const [step, setStep] = useState<DraftStep>('what');
  const [showErrors, setShowErrors] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const prefilled = useRef(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const set = (patch: Partial<SessionDraft>) => setDraft((d) => ({ ...d, ...patch }));

  // « Refaire la même » depuis une session (paramètre ?from=)
  useEffect(() => {
    if (prefilled.current || !source.data) return;
    prefilled.current = true;
    setDraft(draftFromSession(source.data));
    setPriceInput(source.data.price_cents ? String(source.data.price_cents / 100) : '');
    setStep('when');
  }, [source.data]);

  const debouncedPlace = useDebounced(placeQuery, 350);
  const places = useQuery({ queryKey: ['geocode', debouncedPlace, lang], queryFn: () => geocode(debouncedPlace, undefined, lang), staleTime: 3600_000 });

  const errors = validateDraft(draft);
  const top = categories.data?.filter((c) => c.parent_id === null) ?? [];
  const selectedCat = categories.data?.find((c) => c.id === draft.categoryId);
  const parentId = selectedCat?.parent_id ?? selectedCat?.id;
  const children = categories.data?.filter((c) => c.parent_id === parentId) ?? [];
  const wall = wallParts(draft.startsAt);
  const timeLabel = `${String(wall.hours).padStart(2, '0')}:${String(wall.minutes).padStart(2, '0')}`;

  const preview = useMemo<SessionSummary>(() => {
    const cat = selectedCat ?? { id: 0, slug: 'other', name_fr: 'Autre', name_en: 'Other', icon: 'other', tint: 'sable' };
    const host = { id: uid ?? 'me', display_name: me?.display_name ?? '', avatar_url: me?.avatar_url ?? null, reliability: me?.reliability ?? null, sessions_hosted: me?.sessions_hosted ?? 0, verified: false };
    return {
      id: 'preview',
      title: draft.title.trim() || t('create.titlePlaceholder'),
      description: draft.description,
      starts_at: draft.startsAt,
      ends_at: new Date(new Date(draft.startsAt).getTime() + draft.durationMin * 60000).toISOString(),
      venue_name: draft.venueName || t('create.venuePlaceholder'),
      address: draft.address,
      lat: draft.lat ?? 0,
      lng: draft.lng ?? 0,
      distance_m: null,
      category: { id: cat.id, slug: cat.slug, name_fr: cat.name_fr, name_en: cat.name_en, icon: cat.icon, tint: cat.tint },
      level: draft.level,
      price_cents: draft.priceCents,
      currency: 'CAD',
      min_players: draft.minPlayers,
      max_players: draft.maxPlayers,
      joined_count: 1,
      waitlist_count: 0,
      cover_url: draft.coverUrl,
      cover_blurhash: null,
      status: 'published',
      cancellation_policy: draft.cancellationPolicy,
      host,
      participants_preview: uid ? [{ id: uid, display_name: host.display_name, avatar_url: host.avatar_url }] : [],
      my_status: null,
      group: null,
      series_id: null,
      recurrence_rule: null,
    };
  }, [draft, selectedCat, me, uid, t]);

  const goTo = (s: DraftStep) => {
    setStep(s);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const idx = STEPS.indexOf(step);

  const setDay = (fromIso: string) => {
    const d = wallParts(fromIso);
    set({ startsAt: zonedWallTimeToUtc(d.year, d.month, d.day, wall.hours, wall.minutes) });
  };
  const setTime = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number) as [number, number];
    set({ startsAt: zonedWallTimeToUtc(wall.year, wall.month, wall.day, h, m) });
  };
  const nudgeTime = (deltaMin: number) => set({ startsAt: new Date(new Date(draft.startsAt).getTime() + deltaMin * 60000).toISOString() });

  const choosePlace = (p: Place) => {
    set({ venueName: draft.venueName || p.name, address: p.address, lat: p.lat, lng: p.lng });
    setPlaceQuery('');
  };

  const publish = async () => {
    const errs = validateDraft(draft);
    const bad = stepOfError(errs);
    if (bad) {
      setShowErrors(true);
      goTo(bad);
      return;
    }
    setPublishing(true);
    try {
      const id = await createSession(draft);
      track('session_created', { category: selectedCat?.slug, price_cents: draft.priceCents, recurrence: draft.recurrence, max_players: draft.maxPlayers, duplicated: !!from });
      void qc.invalidateQueries({ queryKey: ['feed'] });
      void qc.invalidateQueries({ queryKey: ['my-sessions'] });
      toast(t('create.published'), 'celebrate');
      router.replace({ pathname: '/session/[id]', params: { id } });
    } catch (e) {
      toast(errorMessage(e, t), 'error');
    } finally {
      setPublishing(false);
    }
  };

  const err = (k: keyof typeof errors) => (showErrors && errors[k] ? t(errors[k] as never) : null);

  return (
    <KeyboardAvoidingView className="flex-1 bg-bg" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="gap-3 border-b border-line bg-bg px-4 pb-3" style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center justify-between">
          <IconButton icon={Icons.X} label={t('common.close')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          <Text variant="title" accessibilityRole="header">
            {t('create.title')}
          </Text>
          <View className="w-12" />
        </View>
        <View className="flex-row gap-2" accessibilityRole="tablist">
          {STEPS.map((s) => (
            <Pill key={s} size="sm" label={t(stepLabel[s])} selected={s === step} onPress={() => goTo(s)} className="flex-1 justify-center px-1" />
          ))}
        </View>
      </View>

      <ScrollView ref={scroll} contentContainerClassName="gap-6 px-4 py-4" contentContainerStyle={{ paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <View className="gap-2">
          <Text variant="label" tone="soft">
            {t('create.preview')}
          </Text>
          <View pointerEvents="none">
            <SessionCard session={preview} onPress={() => undefined} onJoin={() => undefined} currentUserId={null} />
          </View>
        </View>

        {step === 'what' ? (
          <>
            {past.data?.length ? (
              <Field label={t('create.redo')}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                  {past.data.map((s) => {
                    const tint = tintFor(s.category.tint);
                    return (
                      <PressableScale
                        key={s.id}
                        accessibilityRole="button"
                        accessibilityLabel={`${t('create.redo')} : ${s.title}`}
                        onPress={() => {
                          setDraft(draftFromSession(s));
                          setPriceInput(s.price_cents ? String(s.price_cents / 100) : '');
                          goTo('when');
                        }}
                        className="w-[200px] gap-2 rounded-card p-3"
                        style={{ backgroundColor: tint.bg }}
                      >
                        <ActivityIcon name={s.category.icon} size={24} color={tint.fg} />
                        <Text variant="heading" tone="inherit" numberOfLines={2} style={{ color: tint.fg }}>
                          {s.title}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </ScrollView>
              </Field>
            ) : null}

            <Field label={t('create.activity')}>
              <View className="flex-row flex-wrap gap-2">
                {top.map((c) => (
                  <CategoryChip key={c.id} category={c} selected={parentId === c.id} onPress={() => set({ categoryId: c.id })} />
                ))}
              </View>
              {children.length ? (
                <View className="flex-row flex-wrap gap-2 pt-1">
                  {children.map((c) => (
                    <Pill key={c.id} size="sm" label={categoryName(c, i18n.language)} selected={draft.categoryId === c.id} onPress={() => set({ categoryId: c.id })} />
                  ))}
                </View>
              ) : null}
              {err('category') ? <Text tone="danger">{t('create.activity')}</Text> : null}
            </Field>
            <TextField label={t('create.titleLabel')} placeholder={t('create.titlePlaceholder')} value={draft.title} onChangeText={(title) => set({ title })} maxLength={80} error={err('title')} />
            <TextField label={t('create.description')} placeholder={t('create.descriptionPlaceholder')} value={draft.description} onChangeText={(description) => set({ description })} multiline maxLength={1000} />
          </>
        ) : null}

        {step === 'when' ? (
          <>
            <Field label={t('create.date')}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                {nextDays(21).map((d) => {
                  const p = wallParts(d.from);
                  return <Pill key={d.from} label={formatShortDate(d.from, lang)} selected={p.day === wall.day && p.month === wall.month} onPress={() => setDay(d.from)} />;
                })}
              </ScrollView>
            </Field>
            <Field label={t('create.time')}>
              <View className="flex-row items-center justify-between rounded-card border border-line bg-surface p-2">
                <IconButton icon={Icons.Minus} label="−15 min" variant="ghost" onPress={() => nudgeTime(-15)} />
                <Text variant="display" tabular accessibilityLiveRegion="polite">
                  {formatStartTime(draft.startsAt, lang)}
                </Text>
                <IconButton icon={Icons.Plus} label="+15 min" variant="ghost" onPress={() => nudgeTime(15)} />
              </View>
              <View className="flex-row flex-wrap gap-2">
                {TIMES.map((hhmm) => (
                  <Pill key={hhmm} size="sm" label={hhmm} selected={timeLabel === hhmm} onPress={() => setTime(hhmm)} />
                ))}
              </View>
              {err('startsAt') ? <Text tone="danger">{err('startsAt')}</Text> : null}
            </Field>
            <Field label={t('create.duration')}>
              <View className="flex-row flex-wrap gap-2">
                {DURATIONS.map((m) => (
                  <Pill key={m} label={formatDuration(m, lang)} selected={draft.durationMin === m} onPress={() => set({ durationMin: m })} />
                ))}
              </View>
            </Field>
            <Field label={t('create.recurrence')}>
              <View className="flex-row flex-wrap gap-2">
                {(['none', 'weekly', 'biweekly'] as Recurrence[]).map((r) => (
                  <Pill
                    key={r}
                    label={r === 'none' ? t('create.recurrenceNone') : r === 'weekly' ? t('session.everyWeek') : t('session.everyTwoWeeks')}
                    selected={draft.recurrence === r}
                    onPress={() => set({ recurrence: r })}
                  />
                ))}
              </View>
            </Field>
          </>
        ) : null}

        {step === 'where' ? (
          <>
            <TextField label={t('create.venue')} placeholder={t('create.venuePlaceholder')} value={draft.venueName} onChangeText={(venueName) => set({ venueName })} maxLength={80} error={err('place')} />
            <TextField label={t('create.addressSearch')} placeholder={t('create.address')} value={placeQuery} onChangeText={setPlaceQuery} autoCorrect={false} />
            <View className="gap-2">
              {places.data?.length ? (
                places.data.map((p) => (
                  <PressableScale key={p.id} accessibilityRole="button" accessibilityLabel={`${p.name}, ${p.address}`} onPress={() => choosePlace(p)} className={cn('min-h-tap flex-row items-center gap-3 rounded-field border bg-surface px-4 py-3', draft.lat === p.lat && draft.lng === p.lng ? 'border-2 border-ink' : 'border-line')}>
                    <Icons.MapPin size={20} weight="bold" />
                    <View className="flex-1">
                      <Text variant="bodyStrong">{p.name}</Text>
                      <Text variant="caption" tone="soft" numberOfLines={1}>
                        {p.address}
                      </Text>
                    </View>
                  </PressableScale>
                ))
              ) : debouncedPlace.length >= 3 ? (
                <Text tone="soft">{t('create.addressNoResult')}</Text>
              ) : null}
            </View>
            {draft.lat != null && draft.lng != null ? (
              <View className="gap-2">
                <MiniMap lat={draft.lat} lng={draft.lng} tint={selectedCat?.tint ?? 'sable'} />
                <Text variant="caption" tone="soft">
                  {draft.address}
                </Text>
              </View>
            ) : null}
          </>
        ) : null}

        {step === 'details' ? (
          <>
            <Field label={t('create.players')}>
              <View className="flex-row gap-3">
                <Stepper label={t('create.minPlayers')} value={draft.minPlayers} min={1} max={draft.maxPlayers} onChange={(minPlayers) => set({ minPlayers })} />
                <Stepper label={t('create.maxPlayers')} value={draft.maxPlayers} min={Math.max(2, draft.minPlayers)} max={100} onChange={(maxPlayers) => set({ maxPlayers })} />
              </View>
              {err('players') ? <Text tone="danger">{err('players')}</Text> : null}
            </Field>
            <Field label={t('create.level')}>
              <View className="flex-row flex-wrap gap-2">
                {LEVELS.map((l) => (
                  <Pill key={l} label={t(`levels.${l}`)} selected={draft.level === l} onPress={() => set({ level: l })} />
                ))}
              </View>
            </Field>
            <Field label={t('create.price')}>
              <View className="flex-row gap-2">
                <Pill label={t('create.priceFree')} selected={draft.priceCents === 0} onPress={() => (set({ priceCents: 0 }), setPriceInput(''))} />
                <Pill label={t('create.pricePaid')} selected={draft.priceCents > 0 || priceInput !== ''} onPress={() => (setPriceInput(priceInput || '10'), set({ priceCents: dollarsToCents(priceInput || '10') ?? 1000 }))} />
              </View>
              {draft.priceCents > 0 || priceInput !== '' ? (
                <>
                  <TextField
                    label={t('create.price')}
                    value={priceInput}
                    keyboardType="decimal-pad"
                    onChangeText={(v) => {
                      setPriceInput(v);
                      set({ priceCents: dollarsToCents(v) ?? 0 });
                    }}
                    error={err('price')}
                  />
                  <Text variant="caption" tone="soft">
                    {t('create.pricePaymentNote')}
                  </Text>
                </>
              ) : null}
            </Field>
            <Field label={t('create.cancellation')}>
              <View className="gap-2">
                {POLICIES.map((p) => (
                  <Pill key={p} label={t(p === 'flexible' ? 'session.policyFlexible' : p === 'moderate' ? 'session.policyModerate' : 'session.policyStrict')} selected={draft.cancellationPolicy === p} onPress={() => set({ cancellationPolicy: p })} />
                ))}
              </View>
            </Field>
            <Field label={t('create.cover')}>
              {draft.coverUrl ? <Image source={{ uri: draft.coverUrl }} style={{ height: 140, borderRadius: 20 }} contentFit="cover" /> : <Text tone="soft">{t('create.coverGenerated')}</Text>}
              <Button
                label={t('create.coverAdd')}
                variant="outline"
                icon={Icons.ImageSquare}
                loading={uploading}
                onPress={async () => {
                  if (!uid) return;
                  setUploading(true);
                  try {
                    const url = await pickAndUpload('covers', uid);
                    if (url) set({ coverUrl: url });
                  } catch (e) {
                    toast(errorMessage(e, t), 'error');
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </Field>
            {adminGroups.data?.length ? (
              <Field label={t('create.inGroup')}>
                <View className="flex-row flex-wrap gap-2">
                  <Pill label={t('create.recurrenceNone')} selected={!draft.groupId} onPress={() => set({ groupId: null })} />
                  {adminGroups.data.map((g) => (
                    <Pill key={g.id} icon={Icons.UsersThree} label={g.name} selected={draft.groupId === g.id} onPress={() => set({ groupId: g.id })} />
                  ))}
                </View>
              </Field>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 flex-row gap-3 border-t border-line bg-surface px-4 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
        {idx > 0 ? <Button label={t('common.back')} variant="outline" size="lg" onPress={() => goTo(STEPS[idx - 1]!)} /> : null}
        <View className="flex-1">
          {step === 'details' ? (
            <Button label={t('create.publish')} size="lg" fullWidth loading={publishing} onPress={publish} />
          ) : (
            <Button label={t('create.next')} size="lg" fullWidth onPress={() => goTo(STEPS[idx + 1]!)} />
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
