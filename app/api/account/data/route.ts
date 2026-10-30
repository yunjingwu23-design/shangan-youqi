import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api, actor, databaseError, readBody } from '@/lib/api';
export const DELETE = api(async (request) => {
  z.object({ confirmation: z.literal('删除个人数据') })
    .strict()
    .parse(await readBody(request));
  const { db } = await actor();
  const { error } = await db.rpc('delete_my_personal_data');
  databaseError(error);
  return NextResponse.json({ deleted: true });
}, true);
