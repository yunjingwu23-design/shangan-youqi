import { NextResponse } from 'next/server';
import { api, actor, databaseError, readBody } from '@/lib/api';
import { profileSchema } from '@/lib/validation';
export const GET = api(async () => {
  const { db, user, userId } = await actor();
  const { data, error } = await db.from('profiles').select('*').eq('user_id', userId).single();
  databaseError(error);
  return NextResponse.json({ profile: data, email: user.email });
});
export const PATCH = api(async (request) => {
  const input = profileSchema.parse(await readBody(request));
  const { db, userId } = await actor();
  const { data, error } = await db
    .from('profiles')
    .update(input)
    .eq('user_id', userId)
    .select()
    .single();
  databaseError(error);
  return NextResponse.json({ profile: data });
}, true);
