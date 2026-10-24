import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';
import { toAppError } from './errors';

/** Choisit une image et l'envoie dans Storage sous <bucket>/<uid>/… (policy : dossier personnel). */
export async function pickAndUpload(bucket: 'covers' | 'avatars', userId: string, aspect: [number, number] = [16, 9]): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect, quality: 0.8 });
  if (res.canceled || !res.assets[0]) return null;
  const asset = res.assets[0];
  const ext = asset.mimeType === 'image/png' ? 'png' : asset.mimeType === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;
  const body = await (await fetch(asset.uri)).arrayBuffer();
  const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType: asset.mimeType ?? 'image/jpeg', upsert: false });
  if (error) throw toAppError(error);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
