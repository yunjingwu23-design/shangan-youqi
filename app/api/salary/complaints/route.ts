import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api, actor, readBody } from '@/lib/api';
import { salaryError } from '@/lib/salary/server';
export const POST = api(async (req) => {
  const v = z
    .object({ group_key: z.string().min(1).max(500), reason: z.string().trim().min(10).max(500) })
    .strict()
    .parse(await readBody(req, 4000));
  const { db, userId } = await actor();
  const r = await db.from('salary_complaints').insert({ ...v, user_id: userId });
  salaryError(r.error);
  return NextResponse.json({ submitted: true }, { status: 201 });
}, true);
