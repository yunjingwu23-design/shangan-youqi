import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api, actor, readBody } from '@/lib/api';
import { adminError } from '@/lib/admin/server';
export const POST = api(async (request) => {
  const identity = await actor(),
    { token } = z
      .object({ token: z.string().regex(/^[A-Za-z0-9_-]{40,128}$/) })
      .strict()
      .parse(await readBody(request));
  const result = await identity.db.rpc('admin_accept_invitation', { invite_token: token });
  adminError(result.error);
  return NextResponse.json({ role: result.data.role, redirectTo: '/admin' });
}, true);
