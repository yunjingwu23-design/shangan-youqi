import { NextResponse } from 'next/server';
import { api, actor, readBody } from '@/lib/api';
import { scheduleEventSchema } from '@/lib/validation';
import { scheduleSchemaMissing, scheduleWriteError } from '@/lib/schedule-server';

export const GET = api(async () => {
  const { db, userId } = await actor();
  const { data, error } = await db
    .from('schedule_events')
    .select('*')
    .eq('user_id', userId)
    .order('starts_at', { ascending: true })
    .limit(500);
  if (scheduleSchemaMissing(error)) return NextResponse.json({ events: [], setupRequired: true });
  if (error) return NextResponse.json({ error: '暂时无法读取日程，请稍后重试。' }, { status: 503 });
  return NextResponse.json({ events: data, setupRequired: false });
});

export const POST = api(async (request) => {
  const input = scheduleEventSchema.parse(await readBody(request));
  const { db, userId } = await actor();
  const { data, error } = await db
    .from('schedule_events')
    .insert({
      ...input,
      starts_at: new Date(input.starts_at).toISOString(),
      user_id: userId,
    })
    .select()
    .single();
  scheduleWriteError(error);
  return NextResponse.json({ event: data }, { status: 201 });
}, true);
