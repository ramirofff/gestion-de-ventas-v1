import { supabase } from './supabaseClient';

export async function uploadProductImage(file: File): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });
  if (error) return null;
  const { data: publicUrl } = supabase.storage.from('product-images').getPublicUrl(fileName);
  return publicUrl?.publicUrl || null;
}
