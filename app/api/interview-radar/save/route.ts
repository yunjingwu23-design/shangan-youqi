import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api, readBody } from '@/lib/api';
import { toggleSave } from '@/lib/interview-radar/import';
export const POST = api(async (req) => {
  const input = z
    .object({ experienceId: z.uuid(), saved: z.boolean() })
    .strict()
    .parse(await readBody(req, 1000));
  await toggleSave(input.experienceId, input.saved);
  return NextResponse.json({ ok: true });
}, true);
