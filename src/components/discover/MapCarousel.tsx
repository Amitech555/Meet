import { useEffect, useRef } from 'react';
import { ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';
import { SessionCard } from '../session/SessionCard';
import type { SessionSummary } from '@/features/sessions/types';

const CARD_W = 320;
const GAP = 12;

/** Carrousel de cartes en bas de la carte ; suit la sélection (et la pilote au défilement). */
export function MapCarousel({
  sessions,
  selectedId,
  onSelect,
  onOpen,
  onJoin,
  currentUserId,
  joiningId,
}: {
  sessions: SessionSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpen: (s: SessionSummary) => void;
  onJoin: (s: SessionSummary) => void;
  currentUserId: string | null;
  joiningId?: string;
}) {
  const ref = useRef<ScrollViewInstance>(null);
  const index = Math.max(0, sessions.findIndex((s) => s.id === selectedId));

  useEffect(() => {
    ref.current?.scrollTo({ x: index * (CARD_W + GAP), animated: true });
  }, [index]);

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / (CARD_W + GAP));
    const s = sessions[i];
    if (s && s.id !== selectedId) onSelect(s.id);
  };

  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={CARD_W + GAP}
      decelerationRate="fast"
      onMomentumScrollEnd={onEnd}
      contentContainerClassName="gap-3 px-4"
    >
      {sessions.map((s) => (
        <View key={s.id} style={{ width: CARD_W }}>
          <SessionCard
            session={s}
            variant="carousel"
            onPress={() => onOpen(s)}
            onJoin={() => onJoin(s)}
            currentUserId={currentUserId}
            joining={joiningId === s.id}
          />
        </View>
      ))}
    </ScrollView>
  );
}
