import { supabase } from './supabaseClient';

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  bmp: 'image/bmp',
  jfif: 'image/jpeg',
};

export async function uploadProductImage(file: File): Promise<string | null> {
  // 1) Deducir extensión y MIME válido
  const originalName = file.name || 'image';
  const ext = (originalName.split('.').pop() || '').toLowerCase();
  const guessedType = EXT_TO_MIME[ext];
  const contentType =
    file.type && file.type.trim() !== '' ? file.type : (guessedType || 'application/octet-stream');

  // 2) Nombre seguro
  const safeBase =
    originalName.replace(/\.[^.]+$/, '').replace(/[^\w\-]+/g, '-').slice(0, 40) || 'img';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBase}.${ext || 'bin'}`;

  console.log('[uploadProductImage] Iniciando subida:', {
    originalName,
    ext,
    reportedType: file.type,
    contentType,
    size: file.size,
    fileName,
  });

  // 3) (Opcional) límite de tamaño
  const MAX_MB = 25;
  if (file.size > MAX_MB * 1024 * 1024) {
    console.warn(
      `[uploadProductImage] Archivo demasiado grande: ${(file.size / 1024 / 1024).toFixed(2)}MB`
    );
    return null;
  }

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[uploadProductImage] Intento ${attempt} de ${maxAttempts}`);
    try {
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType, // <- siempre válido
        });

      console.log('[uploadProductImage] Respuesta storage:', { data, error });

      if (error) {
        console.warn(`[uploadProductImage] Error intento ${attempt}:`, error.message || error);
        if (attempt < maxAttempts) {
          await new Promise((res) => setTimeout(res, attempt * 500));
          continue;
        }
        return null;
      }

      const { data: publicUrl } = supabase.storage.from('product-images').getPublicUrl(fileName);
      if (!publicUrl?.publicUrl) {
        console.error('[uploadProductImage] No se pudo obtener publicUrl:', fileName);
        return null;
      }
      console.log('[uploadProductImage] OK ->', publicUrl.publicUrl);
      return publicUrl.publicUrl;
    } catch (err) {
      console.error(`[uploadProductImage] Excepción intento ${attempt}:`, err);
      if (attempt < maxAttempts) await new Promise((res) => setTimeout(res, attempt * 500));
      else return null;
    }
  }
  return null;
}
