import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api, readBody } from '@/lib/api';
import { siteManager } from '@/lib/catalog-server';
import { salaryError } from '@/lib/salary/server';
export const GET = api(async () => {
  const { db } = await siteManager();
  const results = await Promise.all([
    db.from('salary_reports').select('*').order('created_at', { ascending: false }).limit(200),
    db.from('salary_companies').select('*').order('name'),
    db.from('salary_sources').select('id,name,url,credibility,active'),
    db.from('salary_complaints').select('*').order('created_at', { ascending: false }).limit(100),
    db
      .from('salary_moderation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100),
    db.from('salary_role_aliases').select('*'),
    db.rpc('salary_admin_summary'),
  ]);
  results.forEach((r) => salaryError(r.error));
  const [reports, companies, sources, complaints, logs, aliases, summary] = results.map(
    (r) => r.data || []
  );
  const counts = (summary as any).counts || {};
  const duplicates: string[] = (summary as any).duplicates || [];
  const enriched = (reports as any[]).map((r) => ({
    ...r,
    flags: [
      ...((r.basis === 'daily' && r.base_salary > 2000) ||
      (r.basis === 'monthly' && r.base_salary > 150000) ||
      (r.basis === 'annual' && r.base_salary > 2000000)
        ? ['金额异常，请核验']
        : []),
      ...(duplicates.includes(r.id) ? ['存在相似投稿，核查重复来源'] : []),
    ],
  }));
  return NextResponse.json({
    reports: enriched,
    companies,
    sources,
    complaints,
    logs,
    aliases,
    counts,
  });
});
const review = z
  .object({
    action: z.literal('review'),
    id: z.uuid(),
    version: z.number().int().positive(),
    state: z.enum(['approved', 'rejected', 'hidden']),
    company_id: z.uuid().nullable(),
    role: z.string().trim().max(80),
    city: z.string().trim().max(80),
    source_id: z.uuid().nullable(),
    verified: z.boolean(),
    privacy_checked: z.literal(true),
    note: z.string().trim().min(10).max(500),
  })
  .strict();
const https = z
  .url()
  .max(1000)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === 'https:' && !u.username && !u.password;
    } catch {
      return false;
    }
  });
const manage = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('company'),
      payload: z
        .object({ name: z.string().trim().min(1).max(80), url: z.union([https, z.literal('')]) })
        .strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal('alias'),
      payload: z
        .object({
          alias: z.string().trim().min(1).max(80),
          canonical_role: z.string().trim().min(1).max(80),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal('source'),
      payload: z
        .object({
          name: z.string().trim().min(1).max(100),
          url: https,
          credibility: z.enum(['official', 'licensed']),
          authorization_note: z.string().min(10).max(500),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal('source_toggle'),
      payload: z.object({ id: z.uuid(), active: z.boolean() }).strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal('resolve'),
      payload: z.object({ id: z.uuid(), resolution: z.string().trim().min(10).max(500) }).strict(),
    })
    .strict(),
]);
export const POST = api(async (req) => {
  const { db } = await siteManager(['super_admin', 'reviewer']);
  const body = await readBody(req, 8000);
  if (body.action === 'review') {
    const v = review.parse(body);
    const r = await db.rpc('salary_review', {
      p_id: v.id,
      p_version: v.version,
      p_state: v.state,
      p_company: v.company_id,
      p_role: v.role,
      p_city: v.city,
      p_source: v.source_id,
      p_verified: v.verified,
      p_note: v.note,
    });
    salaryError(r.error);
  } else {
    const v = manage.parse(body);
    const r = await db.rpc('salary_manage', { p_action: v.action, p_payload: v.payload });
    salaryError(r.error);
  }
  return NextResponse.json({ saved: true });
}, true);
