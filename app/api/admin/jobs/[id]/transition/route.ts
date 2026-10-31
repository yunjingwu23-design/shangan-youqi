import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api, readBody } from '@/lib/api';
import { siteManager } from '@/lib/catalog-server';
import { transitionSchema } from '@/lib/admin/model';
import { adminError, adminJob } from '@/lib/admin/server';
export const POST = api(async (request) => {
  const identity = await siteManager(),
    id = z.uuid().parse(new URL(request.url).pathname.split('/').at(-2)),
    input = transitionSchema.parse(await readBody(request));
  const result = await identity.db.rpc('admin_transition_job', {
    job_id: id,
    expected_version: input.expectedVersion,
    action: input.action,
    reason: input.reason,
    source_checked: input.sourceChecked,
  });
  adminError(result.error);
  return NextResponse.json(await adminJob(identity, id));
}, true);
