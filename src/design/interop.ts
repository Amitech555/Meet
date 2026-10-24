import Animated from 'react-native-reanimated';
import { cssInterop } from 'nativewind';
import { Image } from 'expo-image';

// Permet className sur les composants animés et expo-image.
cssInterop(Animated.View, { className: 'style' });
cssInterop(Animated.Text, { className: 'style' });
cssInterop(Image, { className: 'style' });
