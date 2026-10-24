import { View } from 'react-native';
import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import { Icons } from '../ui/icons';
import { tintFor } from '@design/tokens';
import { env } from '@/lib/env';

/** Mini-carte non interactive du lieu. */
export function MiniMap({ lat, lng, tint }: { lat: number; lng: number; tint: string }) {
  const t = tintFor(tint);
  return (
    <View className="h-36 overflow-hidden rounded-card" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
      <Map style={{ flex: 1 }} mapStyle={env.mapStyleUrl} logo={false} compass={false} attribution={false} dragPan={false} touchZoom={false} touchRotate={false} touchPitch={false}>
        <Camera initialViewState={{ center: [lng, lat], zoom: 14.5 }} />
        <Marker id="venue" lngLat={[lng, lat]} anchor="center">
          <View className="h-10 w-10 items-center justify-center rounded-pill border-2 border-surface" style={{ backgroundColor: t.bg }}>
            <Icons.MapPin size={20} weight="fill" color={t.fg} />
          </View>
        </Marker>
      </Map>
    </View>
  );
}
