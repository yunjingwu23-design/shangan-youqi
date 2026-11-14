import { NextResponse } from 'next/server';
import { ApiError, api } from '@/lib/api';
import { siteManager } from '@/lib/catalog-server';
import { toFeedbackItem } from '@/lib/feedback';
import { adminSupabase } from '@/lib/supabase/admin';

export const GET = api(async () => {
  await siteManager();
  const { data, error } = await adminSupabase()
    .from('user_feedback')
    .select('id,kind,content,contact,page_path,user_agent,status,admin_note,created_at')
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) throw new ApiError(503, '反馈列表暂时读不到，请稍后再试。');
  return NextResponse.json({ items: (data || []).map(toFeedbackItem) });
});
