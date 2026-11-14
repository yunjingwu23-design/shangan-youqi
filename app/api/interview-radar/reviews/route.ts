import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api, readBody } from '@/lib/api';
import { submitReview } from '@/lib/interview-radar/import';
export const POST = api(async (req) => {
  const input = z
    .object({
      experienceId: z.uuid(),
      difficulty: z.string().trim().max(60).default(''),
      rating: z.number().int().min(1).max(5).nullable(),
      text: z.string().trim().max(4000).default(''),
    })
    .strict()
    .parse(await readBody(req, 8000));
  await submitReview(input);
  return NextResponse.json({ ok: true }, { status: 201 });
}, true);
