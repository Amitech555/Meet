import { useRef } from 'react';
import { View } from 'react-native';
import { Camera, Map, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { ActivityIcon } from '../ui/ActivityIcon';
import { MapCarousel } from './MapCarousel';
import type { SessionMapProps } from './types';
import { tintFor } from '@design/tokens';
import { env } from '@/lib/env';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/cn';

/** Carte MapLibre : marqueurs aux couleurs des catégories + carrousel synchronisé. */
export function SessionMap(props: SessionMapProps) {
  const { sessions, selectedId, onSelect, center } = props;
  const camera = useRef<CameraRef>(null);

  const select = (id: string) => {
    onSelect(id);
    const s = sessions.find((x) => x.id === id);
    if (s) camera.current?.easeTo({ center: [s.lng, s.lat], duration: 300 });
  };

  return (
    <View className="flex-1">
      <Map style={{ flex: 1 }} mapStyle={env.mapStyleUrl} logo={false} compass={false} attribution>
        <Camera ref={camera} initialViewState={{ center: [center.lng, center.lat], zoom: 12 }} />
        {sessions.map((s) => {
          const tint = tintFor(s.category.tint);
          const active = s.id === selectedId;
          return (
            <Marker
              key={s.id}
              id={s.id}
              lngLat={[s.lng, s.lat]}
              anchor="center"
              selected={active}
              onPress={() => {
                haptics.tap();
                select(s.id);
              }}
            >
              <View
                accessibilityLabel={s.title}
                className={cn('items-center justify-center rounded-pill border-2', active ? 'h-12 w-12 border-ink' : 'h-9 w-9 border-surface')}
                style={{ backgroundColor: tint.bg }}
              >
                <ActivityIcon name={s.category.icon} size={active ? 24 : 18} color={tint.fg} />
              </View>
            </Marker>
          );
        })}
      </Map>
      <View className="absolute bottom-28 left-0 right-0">
        <MapCarousel {...props} onSelect={select} />
      </View>
    </View>
  );
}
