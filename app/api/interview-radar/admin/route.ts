import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api, readBody } from '@/lib/api';
import { radarManage } from '@/lib/interview-radar/server';
export const POST = api(async (req) => {
  const input = z
    .object({
      action: z.enum([
        'company',
        'company_alias',
        'role',
        'role_alias',
        'source',
        'source_toggle',
        'publish_experience',
        'unpublish_experience',
        'review_submission',
        'resolve_duplicate',
      ]),
      payload: z.record(z.string(), z.unknown()),
    })
    .strict()
    .parse(await readBody(req, 20000));
  await radarManage(input.action, input.payload);
  return NextResponse.json({ ok: true });
}, true);
