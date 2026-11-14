import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api, readBody } from '@/lib/api';
import { toggleSubscription } from '@/lib/interview-radar/import';
export const POST = api(async (req) => {
  const input = z
    .object({
      companyId: z.uuid().nullable(),
      roleId: z.uuid().nullable(),
      subscribed: z.boolean(),
    })
    .strict()
    .parse(await readBody(req, 1000));
  await toggleSubscription(input.companyId, input.roleId, input.subscribed);
  return NextResponse.json({ ok: true });
}, true);
