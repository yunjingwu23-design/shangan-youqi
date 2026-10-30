import { NextResponse } from 'next/server';
import { api } from '@/lib/api';
import { interviewActor, ownInterview, interviewError } from '@/lib/interviews/server';
import { adminSupabase } from '@/lib/supabase/admin';
import { tombstoneInterviewAudio } from '@/lib/interviews/audio-storage';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  return api(async () => {
    const identity = await interviewActor();
    const { id } = await context.params;
    const interview = await ownInterview(id, identity);
    const [transcripts, reports, tasks] = await Promise.all([
      identity.db
        .from('interview_transcripts')
        .select('*')
        .eq('interview_id', id)
        .order('version', { ascending: false })
        .limit(1),
      identity.db
        .from('interview_reports')
        .select('*')
        .eq('interview_id', id)
        .order('revision', { ascending: false })
        .limit(10),
      identity.db
        .from('interview_tasks')
        .select('id,kind,state,progress,attempts,error_code,created_at,updated_at')
        .eq('interview_id', id)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);
    for (const result of [transcripts, reports, tasks]) interviewError(result.error);
    return NextResponse.json({
      interview,
      transcript: transcripts.data?.[0] || null,
      reports: reports.data || [],
      task: tasks.data?.[0] || null,
    });
  })(request);
}
export async function DELETE(request: Request, context: Context) {
  return api(async () => {
    const identity = await interviewActor();
    const { id } = await context.params;
    const row = await ownInterview(id, identity);
    const result = await identity.db.rpc('interview_action', { interview: id, action: 'delete' });
    interviewError(result.error);
    const { error } = await tombstoneInterviewAudio(adminSupabase(), row.audio_path);
    return NextResponse.json(
      { deleted: true, cleanupPending: Boolean(error) },
      { status: error ? 202 : 200 }
    );
  }, true)(request);
}
