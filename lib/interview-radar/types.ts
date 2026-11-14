import { z } from 'zod';

// Recruitment types
export const recruitmentTypes = {
  daily_internship: '日常实习',
  conversion_internship: '转正实习',
  autumn_recruitment: '秋招',
  spring_recruitment: '春招',
  undetermined: '未确定',
} as const;
export type RecruitmentType = keyof typeof recruitmentTypes;
export const recruitmentTypeSchema = z.enum([
  'daily_internship',
  'conversion_internship',
  'autumn_recruitment',
  'spring_recruitment',
  'undetermined',
]);

// Interview rounds
export const interviewRounds = {
  written_test: '笔试',
  ai_interview: 'AI 面试',
  online_assessment: '在线测评',
  group_interview: '群面',
  first_round: '一面',
  second_round: '二面',
  third_round: '三面',
  professional_round: '专业面',
  hr_round: 'HR 面',
  final_round: '终面',
  other: '其他',
} as const;
export type InterviewRound = keyof typeof interviewRounds;
export const interviewRoundSchema = z.enum([
  'written_test',
  'ai_interview',
  'online_assessment',
  'group_interview',
  'first_round',
  'second_round',
  'third_round',
  'professional_round',
  'hr_round',
  'final_round',
  'other',
]);

// Question categories
export const questionCategories = {
  self_intro: '自我介绍',
  internship_experience: '实习经历',
  project_deep_dive: '项目深挖',
  industry_knowledge: '行业认知',
  professional_knowledge: '专业知识',
  behavioral: '行为面试',
  situational: '情景问题',
  case_interview: 'Case Interview',
  technical: '技术问题',
  motivation: '求职动机',
  other: '其他',
} as const;
export type QuestionCategory = keyof typeof questionCategories;

// Role categories
export const roleCategories = {
  product_manager: '产品经理',
  operations: '运营',
  procurement: '采销',
  marketing: '市场营销',
  backend_dev: '后端开发',
  frontend_dev: '前端开发',
  algorithm: '算法',
  data_analysis: '数据分析',
  finance: '财务',
  audit: '审计',
  consulting: '咨询',
  human_resources: '人力资源',
  supply_chain: '供应链',
  other: '其他岗位',
} as const;
export type RoleCategory = keyof typeof roleCategories;

// Verification status
export const verificationStatuses = {
  verified: '已核实',
  pending: '待核实',
  secondary: '二次来源',
  expired: '已失效',
} as const;
export type VerificationStatus = keyof typeof verificationStatuses;

export const confidenceLevels = {
  verified: '已核实',
  pending: '待核实',
  inferred: '待审核（AI 推断）',
} as const;

// Types matching DB rows
export type Company = {
  id: string;
  name: string;
  english_name: string;
  industry: string;
  company_group: string;
  verified_status: string;
};

export type JobRole = {
  id: string;
  company_id: string;
  name: string;
  category: RoleCategory;
  custom: boolean;
};

export type InterviewSource = {
  id: string;
  name: string;
  source_type: 'community' | 'official' | 'other';
  supported_methods: string[];
  authorization_status: 'authorized' | 'unauthorized' | 'manual_only';
  last_sync_at: string | null;
  sync_status: 'never' | 'synced' | 'error' | 'disabled';
  error_message: string;
  active: boolean;
};

export type InterviewExperience = {
  id: string;
  company_id: string;
  job_role_id: string;
  recruitment_type: RecruitmentType;
  cohort: string;
  title: string;
  summary: string;
  source_record_id: string | null;
  origin: 'external' | 'user_submission';
  verification_status: VerificationStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InterviewQuestion = {
  id: string;
  experience_id: string;
  company_id: string;
  job_role_id: string;
  recruitment_type: string;
  round: string;
  question_text: string;
  question_category: QuestionCategory;
  confidence_level: 'verified' | 'pending' | 'inferred';
  source_record_id: string | null;
  created_at: string;
};

export type InterviewReview = {
  id: string;
  experience_id: string;
  reviewer_kind: 'original_author' | 'user';
  user_id: string | null;
  difficulty: string;
  experience_rating: number | null;
  review_text: string;
  result: string;
  created_at: string;
};

export type SourceRecord = {
  id: string;
  source_id: string;
  platform_post_id: string;
  normalized_url: string;
  title: string;
  author: string;
  published_at: string | null;
  status: VerificationStatus;
  created_at: string;
};

export type UserSubmission = {
  id: string;
  user_id: string;
  company_name: string;
  job_role_name: string;
  recruitment_type: RecruitmentType;
  cohort: string;
  rounds: string[];
  questions: { text: string; round?: string; category?: string }[];
  review_text: string;
  source_url: string;
  status: 'pending' | 'approved' | 'rejected';
  moderation_note: string;
  created_at: string;
};

// Schemas for user submissions
export const userSubmissionSchema = z
  .object({
    company_name: z.string().trim().min(1, '请填写公司').max(100),
    job_role_name: z.string().trim().min(1, '请填写岗位').max(100),
    recruitment_type: recruitmentTypeSchema,
    cohort: z.string().trim().max(40).default(''),
    rounds: z
      .array(z.string().trim().min(1).max(40))
      .max(12)
      .default([]),
    questions: z
      .array(
        z
          .object({
            text: z.string().trim().min(1, '问题内容不能为空').max(2000),
            round: z.string().trim().max(40).optional(),
            category: z.string().trim().max(40).optional(),
          })
          .strict()
      )
      .max(50)
      .default([]),
    review_text: z.string().trim().max(4000).default(''),
    source_url: z
      .string()
      .max(2000)
      .default('')
      .refine((v) => {
        if (!v) return true;
        try {
          const u = new URL(v);
          return u.protocol === 'https:' && !u.username && !u.password;
        } catch {
          return false;
        }
      }, '请填写不含账号密码的 HTTPS 来源链接'),
  })
  .strict();

export type UserSubmissionInput = z.infer<typeof userSubmissionSchema>;
export type UrlImportInput = z.infer<typeof urlImportSchema>;
export type CsvImportRow = z.infer<typeof csvImportRowSchema>;

// URL import schema
export const urlImportSchema = z
  .object({
    source_id: z.uuid(),
    url: z
      .string()
      .url()
      .refine((v) => {
        const u = new URL(v);
        return u.protocol === 'https:' && !u.username && !u.password;
      }, '请填写不含账号密码的 HTTPS 链接'),
    title: z.string().trim().min(1).max(300),
    author: z.string().trim().max(100).default(''),
    platform_post_id: z.string().trim().max(200).default(''),
    published_at: z.string().trim().max(40).default(''),
  })
  .strict();

// CSV import row
export const csvImportRowSchema = z
  .object({
    company: z.string().trim().min(1).max(100),
    role: z.string().trim().min(1).max(100),
    recruitment_type: recruitmentTypeSchema.default('undetermined'),
    cohort: z.string().trim().max(40).default(''),
    title: z.string().trim().min(1).max(300),
    round: z.string().trim().max(40).default(''),
    question: z.string().trim().max(2000).default(''),
    source_name: z.string().trim().max(60).default(''),
    source_url: z.string().trim().max(2000).default(''),
    published_at: z.string().trim().max(40).default(''),
  })
  .strict();

// Company lookup normalization
export function normalizeName(v: string) {
  return v.trim().toLocaleLowerCase().normalize('NFKC');
}
