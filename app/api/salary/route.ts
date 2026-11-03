import { NextResponse } from 'next/server';
import { api } from '@/lib/api';
import { serverSupabase } from '@/lib/supabase/server';
import { salaryError } from '@/lib/salary/server';
export const GET = api(async (req) => {
  const db = await serverSupabase();
  const r = await db.rpc('salary_distribution');
  salaryError(r.error);
  const aliases = await db.from('salary_role_aliases').select('*');
  salaryError(aliases.error);
  const p = new URL(req.url).searchParams;
  const rows = (r.data || []).filter((row: Record<string, unknown>) =>
    ['company', 'role', 'city', 'cohort', 'education', 'data_year', 'basis'].every((key) => {
      let term = (p.get(key) || '').trim().slice(0, 80);
      if (!term) return true;
      if (key === 'role')
        term =
          aliases.data?.find((a) => a.alias.toLowerCase() === term.toLowerCase())?.canonical_role ||
          term;
      return ['company', 'role', 'city'].includes(key)
        ? String(row[key]).toLowerCase().includes(term.toLowerCase())
        : String(row[key]) === term;
    })
  );
  return NextResponse.json({ groups: rows, privacyMinimum: 5 });
});
