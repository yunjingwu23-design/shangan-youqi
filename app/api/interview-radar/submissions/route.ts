import { NextResponse } from 'next/server';
import { api, readBody } from '@/lib/api';
import { submitInterview, submitReview } from '@/lib/interview-radar/import';
import { userSubmissionSchema } from '@/lib/interview-radar/types';
export const POST = api(async (req) => {
  const input = userSubmissionSchema.parse(await readBody(req, 20000));
  const id = await submitInterview(input);
  return NextResponse.json({ id, status: 'pending' }, { status: 201 });
}, true);
