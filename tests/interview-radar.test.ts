import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeName } from '../lib/interview-radar/types';
import {
  normalizeClassification,
  type AiClassification,
} from '../lib/interview-radar/ai-normalize';
import {
  userSubmissionSchema,
  recruitmentTypeSchema,
  interviewRoundSchema,
} from '../lib/interview-radar/types';

test('company name normalization collapses case and full-width variants', () => {
  assert.equal(normalizeName('京东'), normalizeName('京东'));
  assert.equal(normalizeName('  JD  '), normalizeName('jd'));
  assert.equal(normalizeName('京东集团'), '京东集团');
  assert.notEqual(normalizeName('京东'), normalizeName('腾讯'));
});

test('recruitment type schema only accepts the five defined values', () => {
  for (const v of [
    'daily_internship',
    'conversion_internship',
    'autumn_recruitment',
    'spring_recruitment',
    'undetermined',
  ]) {
    assert.equal(recruitmentTypeSchema.safeParse(v).success, true, v);
  }
  for (const v of ['full_time', 'intern', '', 'autumn']) {
    assert.equal(recruitmentTypeSchema.safeParse(v).success, false, v);
  }
});

test('interview round schema rejects unknown rounds', () => {
  assert.equal(interviewRoundSchema.safeParse('first_round').success, true);
  assert.equal(interviewRoundSchema.safeParse('fifth_round').success, false);
});

test('AI classification normalization never maps unknown values to fabricated enums', () => {
  const c: AiClassification = {
    company: '京东集团',
    job_role: '采销',
    role_category: '采销', // valid role category label
    recruitment_type: '秋招', // valid label
    cohort: '2027届',
    rounds: ['一面', '不存在的轮次'],
    questions: [{ text: '介绍一个项目', round: '一面', category: '项目深挖' }],
    author_difficulty: '中等',
    author_result: null,
    tags: ['秋招'],
    confidence: 'pending',
  };
  const n = normalizeClassification(c);
  assert.equal(n.recruitmentType, 'autumn_recruitment');
  // Unknown round "不存在的轮次" is dropped, "一面" maps to first_round.
  assert.deepEqual(n.rounds, ['first_round']);
  assert.equal(n.roleCategory, 'procurement');
  assert.equal(n.confidence, 'pending');
});

test('AI classification never marks unverified questions as verified', () => {
  const inferred: AiClassification = {
    company: null,
    job_role: null,
    role_category: null,
    recruitment_type: null,
    cohort: null,
    rounds: [],
    questions: [{ text: '猜测的问题', round: null, category: null }],
    author_difficulty: null,
    author_result: null,
    tags: [],
    confidence: 'inferred',
  };
  const n = normalizeClassification(inferred);
  assert.equal(n.recruitmentType, 'undetermined');
  assert.equal(n.confidence, 'inferred'); // must stay inferred, never promoted
});

test('user submission schema rejects missing required fields and fabricated URLs', () => {
  const valid = {
    company_name: '京东集团',
    job_role_name: '采销',
    recruitment_type: 'autumn_recruitment',
    cohort: '2027届',
    rounds: ['first_round'],
    questions: [{ text: '介绍一个项目' }],
    review_text: '面试流程清晰',
    source_url: 'https://example.com/post/1',
  };
  assert.equal(userSubmissionSchema.safeParse(valid).success, true);

  assert.equal(userSubmissionSchema.safeParse({ ...valid, company_name: '' }).success, false);
  assert.equal(userSubmissionSchema.safeParse({ ...valid, job_role_name: '' }).success, false);

  // URL must be https without credentials.
  assert.equal(
    userSubmissionSchema.safeParse({ ...valid, source_url: 'http://example.com' }).success,
    false
  );
  assert.equal(
    userSubmissionSchema.safeParse({
      ...valid,
      source_url: 'https://user:pass@example.com',
    }).success,
    false
  );
});

test('recruitment type default is undetermined, not a guessed type', () => {
  const parsed = userSubmissionSchema.safeParse({
    company_name: '京东',
    job_role_name: '采销',
    recruitment_type: 'undetermined',
  });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.recruitment_type, 'undetermined');
});
