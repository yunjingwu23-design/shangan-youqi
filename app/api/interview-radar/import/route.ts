import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api, actor, readBody } from '@/lib/api';
import { collectAndClassify, importCsv, importUrl } from '@/lib/interview-radar/import';
import { radarError } from '@/lib/interview-radar/server';
import { csvImportRowSchema, urlImportSchema } from '@/lib/interview-radar/types';
export const POST = api(async (req) => {
  // Admin-only: enforced by RLS (import into source_records requires admin role).
  await actor();
  const body = await readBody(req, 500000);
  const mode = z.enum(['url', 'csv', 'collect']).parse(body.mode);
  if (mode === 'url') {
    const input = urlImportSchema.parse(body.input);
    const id = await importUrl(input);
    return NextResponse.json({ id }, { status: 201 });
  }
  if (mode === 'collect') {
    const result = await collectAndClassify({
      listUrl: typeof body.listUrl === 'string' ? body.listUrl : undefined,
      maxPosts: typeof body.maxPosts === 'number' ? body.maxPosts : undefined,
    });
    return NextResponse.json(result, { status: 201 });
  }
  const rows = z.array(csvImportRowSchema).max(1000).parse(body.rows);
  const result = await importCsv(rows);
  return NextResponse.json(result, { status: 201 });
}, true);
