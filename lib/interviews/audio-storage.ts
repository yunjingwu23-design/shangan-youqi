import type { SupabaseClient } from '@supabase/supabase-js';
import { AUDIO_BUCKET } from './schema';
// Replace audio bytes with an empty, inaccessible object until outstanding
// non-upsert upload tokens expire. Removing it immediately would permit a late
// signed upload to recreate the deleted audio at the same path.
export function tombstoneInterviewAudio(db: SupabaseClient, path: string) {
  return db.storage
    .from(AUDIO_BUCKET)
    .upload(path, new Uint8Array(), { upsert: true, contentType: 'audio/mpeg' });
}
