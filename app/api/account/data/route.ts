import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api, actor, databaseError, readBody } from '@/lib/api';
import { purgeInterviewAudio } from '@/lib/interviews/server';
import { purgeResumeFiles } from '@/lib/resume-files/server';
export const DELETE = api(async (request) => {
  z.object({ confirmation: z.literal('删除个人数据') })
    .strict()
    .parse(await readBody(request));
  const identity = await actor();
  const { db } = identity;
  await purgeInterviewAudio(identity);
  await purgeResumeFiles(identity);
  const { error } = await db.rpc('delete_my_personal_data');
  databaseError(error);
  await purgeResumeFiles(identity);
  return NextResponse.json({ deleted: true });
}, true);
