import { NextResponse } from 'next/server';
import { api, ApiError } from '@/lib/api';
import {
  getExperience,
  getSourceRecord,
  listAuthorReviews,
  listQuestionsForExperience,
  listRoundsForExperience,
} from '@/lib/interview-radar/server';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  return api(async () => {
    const { id } = await context.params;
    const experience = await getExperience(id);
    if (!experience) throw new ApiError(404, '面经不存在或尚未发布。');
    const [questions, rounds, authorReviews, sourceRecord] = await Promise.all([
      listQuestionsForExperience(id),
      listRoundsForExperience(id),
      listAuthorReviews(id),
      experience.source_record_id
        ? getSourceRecord(experience.source_record_id)
        : Promise.resolve(null),
    ]);
    return NextResponse.json({ experience, questions, rounds, authorReviews, sourceRecord });
  })(request);
}
