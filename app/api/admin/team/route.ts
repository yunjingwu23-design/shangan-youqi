import { randomBytes, createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api, readBody } from '@/lib/api';
import { siteManager } from '@/lib/catalog-server';
import { adminRoleSchema } from '@/lib/admin/model';
import { adminError } from '@/lib/admin/server';
import { config } from '@/lib/config';
import { consumeLimit } from '@/lib/rate-limit';
const schema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('invite'),
      email: z.email().trim().toLowerCase().max(254),
      role: adminRoleSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal('change'),
      userId: z.uuid(),
      role: adminRoleSchema,
      active: z.boolean(),
      reason: z.string().trim().min(5).max(2000),
    })
    .strict(),
  z.object({ action: z.literal('revoke'), id: z.uuid() }).strict(),
]);
export const GET = api(async () => {
  const identity = await siteManager(['super_admin']);
  const [team, invites] = await Promise.all([
    identity.db.rpc('admin_team'),
    identity.db
      .from('admin_invitations')
      .select('id,email,role,expires_at,state,created_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  adminError(team.error);
  adminError(invites.error);
  return NextResponse.json({ members: team.data, invitations: invites.data });
});
export const POST = api(async (request) => {
  const identity = await siteManager(['super_admin']),
    input = schema.parse(await readBody(request));
  if (input.action === 'invite') {
    await consumeLimit('admin-invite', identity.userId, 20, 3600);
    const token = randomBytes(32).toString('base64url'),
      hash = createHash('sha256').update(token).digest('hex'),
      result = await identity.db.rpc('admin_create_invitation', {
        target_email: input.email,
        target_role: input.role,
        invite_hash: hash,
      });
    adminError(result.error);
    return NextResponse.json(
      { invitation: result.data, url: config().origin + '/admin/accept?token=' + token },
      { status: 201 }
    );
  }
  const result =
    input.action === 'revoke'
      ? await identity.db.rpc('admin_revoke_invitation', { invitation_id: input.id })
      : await identity.db.rpc('admin_change_membership', {
          target_user: input.userId,
          target_role: input.role,
          is_active: input.active,
          reason: input.reason,
        });
  adminError(result.error);
  return NextResponse.json({ saved: true });
}, true);
