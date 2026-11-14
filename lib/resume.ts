import { z } from 'zod';

/** 站内版式：三个基础版式 + 三个来自我们自有 Word 模板的官方版式。 */
export const RESUME_TEMPLATES = [
  'classic',
  'compact',
  'sidebar',
  'consulting',
  'bilingual',
  'classic-en',
] as const;
export type ResumeTemplateKey = (typeof RESUME_TEMPLATES)[number];

export const resumeDocumentSchema = z
  .object({
    format: z.literal('shangan-resume-v1'),
    template: z.enum(RESUME_TEMPLATES).optional(),
    basics: z
      .object({
        name: z.string().max(60),
        headline: z.string().max(100),
        email: z.string().max(254),
        phone: z.string().max(50),
        city: z.string().max(60),
        links: z.string().max(300),
      })
      .strict(),
    sections: z
      .array(
        z
          .object({
            id: z.uuid(),
            title: z.string().trim().min(1).max(60),
            body: z.string().max(5000),
          })
          .strict()
      )
      .min(1)
      .max(12),
  })
  .strict()
  .refine((doc) => JSON.stringify(doc).length <= 20000, '简历内容超出保存上限，请精简后重试');
export type ResumeDocument = z.infer<typeof resumeDocumentSchema>;
export const resumeSaveSchema = z
  .object({
    id: z.uuid().optional(),
    expectedUpdatedAt: z.iso.datetime({ offset: true }).optional(),
    title: z.string().trim().min(1).max(120),
    company: z.string().trim().max(100),
    document: resumeDocumentSchema,
  })
  .strict();
export function emptyResume(name = '', email = ''): ResumeDocument {
  return {
    format: 'shangan-resume-v1',
    basics: { name, headline: '', email, phone: '', city: '', links: '' },
    sections: ['教育经历', '工作 / 实习经历', '项目经历', '技能与其他'].map((title) => ({
      id: crypto.randomUUID(),
      title,
      body: '',
    })),
  };
}
export function readResume(
  content: string,
  id: string
): { document: ResumeDocument; legacy: boolean } {
  try {
    const parsed = resumeDocumentSchema.safeParse(JSON.parse(content));
    if (parsed.success) return { document: parsed.data, legacy: false };
  } catch {
    /* Legacy text drafts are preserved until the user explicitly saves. */
  }
  const document = emptyResume();
  document.sections = Array.from(
    { length: Math.max(1, Math.ceil(content.length / 5000)) },
    (_, index) => ({
      id: index === 0 ? id : crypto.randomUUID(),
      title: `原有文字草稿${content.length > 5000 ? ` ${index + 1}` : ''}`,
      body: content.slice(index * 5000, (index + 1) * 5000),
    })
  );
  return { document, legacy: true };
}

/** 「选择版式」用的清单：只切换排版，不改动已填写的内容。 */
export const resumeTemplateOptions: {
  key: ResumeTemplateKey;
  label: string;
  description: string;
  official: boolean;
}[] = [
  { key: 'classic', label: '经典单栏', description: '清晰分区，适合通用求职', official: false },
  { key: 'compact', label: '紧凑履历', description: '更紧凑的字体与段落间距', official: false },
  { key: 'sidebar', label: '侧栏信息', description: '个人信息侧栏与经历正文', official: false },
  {
    key: 'consulting',
    label: '咨询单栏',
    description: '豌豆派模板版式，咨询 / 金融 / 快消向',
    official: true,
  },
  {
    key: 'bilingual',
    label: '双语经历版',
    description: '时间 / 职位 / 公司三段式，中英通用',
    official: true,
  },
  {
    key: 'classic-en',
    label: '英文范例版',
    description: '英文简历排版，外企与海外投递',
    official: true,
  },
];

/** 模板库分组：按版式结构分类，便于按求职方向挑。 */
export type ResumePresetGroupKey = 'cn-single' | 'cn-column' | 'bilingual' | 'minimal';

export const resumePresetGroups: {
  key: ResumePresetGroupKey;
  label: string;
  hint: string;
}[] = [
  { key: 'cn-single', label: '中文单栏', hint: '一页写完，HR 扫读最快' },
  { key: 'cn-column', label: '中文双栏 / 侧栏', hint: '信息栏 + 主内容，经历多时更省版面' },
  { key: 'bilingual', label: '中英双语', hint: '小节中英对照，投外企与涉外岗位' },
  { key: 'minimal', label: '极简与英文', hint: '弱化装饰，咨询 / 投研 / 海外投递' },
];

/** 官方模板：来自我们自有的 Word 模板库，可下载原件，也可一键套用章节骨架。 */
export type ResumeTemplatePreset = {
  id: string;
  key: ResumeTemplateKey;
  label: string;
  group: ResumePresetGroupKey;
  origin: string;
  description: string;
  highlights: string[];
  roles: string;
  accent: string;
  thumb: string;
  file: { href: string; name: string; note: string };
  title: string;
  sections: { title: string; body: string }[];
};

/** 章节骨架：套用模板时预填的占位内容，按版式结构分成几套复用。 */
const skeletonCnStandard: { title: string; body: string }[] = [
  {
    title: '教育经历',
    body: 'XX大学 · 上海                          2022.09 – 2026.06\nXX专业 · 本科                            GPA：3.7 / 4.0（专业前 10%）\n· 主修课程：<与目标岗位强相关的 3–5 门课>\n· 在校荣誉：校级一等奖学金（2023、2024）、优秀学生干部',
  },
  {
    title: '实习经历',
    body: 'XX科技有限公司 · 上海                2025.07 – 2025.10\n<岗位名称> · 实习生\n· 负责 <业务模块>，独立完成 <具体动作>，把 <指标> 从 XX 提升到 XX\n· 搭建 <工具 / 流程 / 模板>，团队复用后节省 <时长>，覆盖 <范围>\n· 联动 <协作方> 推进 <项目>，上线后 <业务结果>',
  },
  {
    title: '项目经历',
    body: 'XX 项目 · 负责人                     2025.03 – 2025.06\n· 目标：<要解决的问题，一句话说清>\n· 动作：拆解为 X 个阶段，主导其中 <关键环节>\n· 结果：<可量化的结果，尽量用数字>\n\nXX 课程项目 · 成员                  2024.09 – 2024.12\n· <承担的角色 + 交付物>',
  },
  {
    title: '技能与证书',
    body: '语言：英语（CET-6 XXX / 雅思 X.X）、普通话（二级甲等）\n工具：Excel（数据透视 / 函数）、PowerPoint、SQL、Python、Figma\n证书：<与岗位相关的证书>',
  },
];

const skeletonCnColumn: { title: string; body: string }[] = [
  {
    title: '教育背景',
    body: '2022.09 – 2026.06      XX大学      XX专业（本科）\n· 主修课程：<3–5 门与岗位相关的课>\n· 荣誉奖项：校级一等奖学金、优秀毕业生',
  },
  {
    title: '实习经历',
    body: '2025.07 – 2025.10      XX科技有限公司      <岗位名称>实习生\n· 负责 <业务模块>，独立完成 <动作>，<指标> 提升 XX%\n· 搭建 <工具 / 流程>，覆盖 <范围>，节省 <时长>\n· 协同 <团队> 推进 <项目>，达成 <结果>',
  },
  {
    title: '校园经历',
    body: '2023.09 – 2024.06      XX大学学生会      外联部干事\n· 对接 X 家企业，落地 X 场活动，累计拉新赞助 X 万元\n· 带教 X 名新成员，沉淀活动执行 SOP',
  },
  {
    title: '项目经历',
    body: '2024.10 – 2025.01      XX 校园电商项目      负责人\n· 目标：<要解决的问题>\n· 动作：<关键做法>\n· 结果：<量化结果>',
  },
];

const skeletonBilingual: { title: string; body: string }[] = [
  {
    title: '教育背景 Education',
    body: '2022.09 – 2026.06      XX大学      XX专业 · 本科\n· 主修课程：<课程 1>、<课程 2>、<课程 3>\n· 荣誉奖项：校级一等奖学金（2023、2024）',
  },
  {
    title: '实习经历 Experience',
    body: '2025.07 – 2025.10      XX科技有限公司      <岗位名称>实习生\n· 负责 <业务模块> 的日常工作，独立完成 <动作>\n· 输出 <成果>，使 <指标> 提升 XX%\n· 参与 <项目>，承担 <角色>，交付 <结果>',
  },
  {
    title: '项目经历 Projects',
    body: '2025.03 – 2025.06      XX 项目      负责人\n· 主导 <环节>，协调 X 人小组，按期交付 <成果>\n· 通过 <方法> 达成 <可量化结果>',
  },
  {
    title: '技能证书 Skills',
    body: '语言能力：英语（CET-6 XXX）、普通话（二级甲等）\n专业技能：<工具 1>、<工具 2>、<工具 3>\n其他能力：<证书 / 驾照 / 特长>',
  },
  {
    title: '自我评价 About Me',
    body: '· <一句话概括你的核心优势，配一个事实支撑>\n· <第二项优势，配一个事实支撑>\n· <求职动机：为什么投这个岗位 / 行业>',
  },
];

const skeletonMinimal: { title: string; body: string }[] = [
  {
    title: '教育背景',
    body: '2022.09 – 2026.06      XX大学 · XX学院      XX专业（本科）\n· GPA：3.7 / 4.0（专业前 10%）  · 荣誉：一等奖学金 ×2',
  },
  {
    title: '实习经历',
    body: 'XX科技有限公司 · <部门>                上海，中国    2025.07 – 2025.10\n<岗位名称>\n· <负责什么>，<做出什么动作>，<带来什么可量化结果>\n· <负责什么>，<做出什么动作>，<带来什么可量化结果>',
  },
  {
    title: '项目活动经历',
    body: 'XX大学学生会 · 主席                    上海，中国    2024.09 – 2025.06\n· <项目或活动名称>：<你的动作 + 结果>',
  },
  {
    title: '所获荣誉与能力',
    body: '· 奖项：<奖学金 / 竞赛名次，注明级别与比例>\n· 专业技能：<工具 1>、<工具 2>、<工具 3>\n· 语言能力：英语（CET-6 XXX / 雅思 X.X）',
  },
];

const skeletonEnglishPro: { title: string; body: string }[] = [
  {
    title: 'EDUCATION',
    body: 'XX University, Shanghai, China                          Sep. 2022 – Jun. 2026\nBachelor of Management, Major in <Major>              GPA: 3.7 / 4.0 (Top 10%)\n· Courses: <Course 1> (GPA: 3.9), <Course 2>, <Course 3>\n· Achievements: First-class Scholarship (2023, 2024)',
  },
  {
    title: 'PROFESSIONAL EXPERIENCE',
    body: 'XX Technology Co., Ltd.                                Shanghai, China     Jul. 2025 – Oct. 2025\n<Job Title> Intern\n· Completed <task> independently, improving <metric> by XX%\n· Built <tool / process> adopted by the team, saving XX hours per week\n· Coordinated with <stakeholders> to launch <project>, achieving <result>',
  },
  {
    title: 'CO-CURRICULAR ACTIVITIES AND ACHIEVEMENTS',
    body: '<Competition / Organization>                            Shanghai, China     Mar. 2025 – Jun. 2025\nTeam Leader\n· Led a team of 4 to deliver <deliverable> within 72 hours\n· Ranked in the top X of XX teams, winning the <award>',
  },
  {
    title: 'SKILLS AND INTERESTS',
    body: '· Language: English (IELTS 7.0, CET-6 XXX), Mandarin (native)\n· Computer: Excel (Pivot Table, VLOOKUP), PowerPoint, SQL, Python\n· Interests: <keep it short and specific>',
  },
];

export const resumeTemplatePresets: ResumeTemplatePreset[] = [
  {
    id: 'consulting-wandoupai',
    key: 'consulting',
    label: '咨询单栏模板',
    group: 'cn-single',
    roles: '咨询 / 投行 / 快消',
    accent: '#1f2d3d',
    thumb: '/resume-templates/thumbs/consulting-wandoupai.png',
    origin: '豌豆派简历模板',
    description: '投行 / 咨询 / 快消通用的单栏结构，项目符号分两级，一页装得下两段完整实习。',
    highlights: ['教育 / 实习 / 活动 / 技能', '二级项目符号', '单页单栏'],
    file: {
      href: '/resume-templates/consulting-wandoupai.docx',
      name: '豌豆派简历模板.docx',
      note: 'Word 原件，可直接填写',
    },
    title: '咨询单栏简历',
    sections: [
      {
        title: '教育经历',
        body: 'XX大学 · 上海 | 中国                          2024.09 – 2027.06\nXX学硕士，XXX专业\n· 成绩：3.8 / 4.0；专业排名：5 / 120\n· 相关课程：<与目标岗位相关的课程>\n· 相关荣誉：<奖学金 / 优秀学生干部>',
      },
      {
        title: '实习经历',
        body: 'XX咨询公司 · 上海 | 中国                    2025.07 – 2025.09\n战略咨询部 · 实习生\n· 关于 AAA 的某咨询项目：\n  – 领导 4 人小组优化 XXX 部门工作流程，节约超过 15% 总成本\n  – 利用模糊分析评估现有营销计划有效性，提出 5 点改进建议\n· 关于 BBB 的某金融项目：\n  – 深度参与 XX 公司首次公开募股，分析主要竞争对手并形成 20 页报告',
      },
      {
        title: '活动经历',
        body: 'XX 商业案例大赛 · 队长                        2025.03 – 2025.05\n· 领导 4 人小组在 72 小时内完成 XX 问题分析，交付 30 页 PPT\n· 从 120 支队伍中进入决赛，获得全国二等奖',
      },
      {
        title: '技能',
        body: '语言：英语（商务水平，雅思 7.0）、普通话（母语）\n技术：Excel（数据透视 / 函数）、PowerPoint、SQL、Python',
      },
    ],
  },
  {
    id: 'bilingual-cv',
    key: 'bilingual',
    label: '双语经历模板',
    group: 'bilingual',
    roles: '外企 / 涉外岗位',
    accent: '#1d4ed8',
    thumb: '/resume-templates/thumbs/bilingual-cv.png',
    origin: 'CV 模板（中英双版）',
    description: '时间 / 职位 / 公司三段对齐，中文正文配英文版式，实习经历按 STAR 法则分行写。',
    highlights: ['三段式行首对齐', 'STAR 分条', '中英双语'],
    file: {
      href: '/resume-templates/bilingual-cv.docx',
      name: 'CV模板.docx',
      note: 'Word 原件，含中英两版',
    },
    title: '双语经历简历',
    sections: [
      {
        title: '教育背景',
        body: '2021.09 – 2025.06    XX大学    XXXXXX（专业）    本科\n· 职务：校学生会外联部干事\n· 荣誉 / 奖项：校级一等奖学金、优秀毕业生\n· 语言：英语（CET-6 580）\n· 技能：Excel、PowerPoint、Figma',
      },
      {
        title: '实习经历',
        body: '2025.06 – 2025.09    XX科技（上海）    内容运营实习生\n· 目标：负责小红书账号从 0 到 1 冷启动，3 个月涨粉 2.1 万\n· 动作：搭建选题库与内容日历，每周稳定产出 12 条图文\n· 结果：单篇最高互动 8,000+，带动店铺 GMV 增长 32%',
      },
      {
        title: '项目经历',
        body: '2024.10 – 2025.01    XX 校园电商项目    负责人\n· 目标：为校园二手交易平台搭建内容种草体系\n· 动作：策划 6 期主题内容，联动 15 位校园 KOC\n· 结果：页面转化率从 2.1% 提升到 4.7%，月活增长 3,200',
      },
      {
        title: '校园经历',
        body: '2023.09 – 2024.06    校学生会外联部    干事\n· 负责 10 余个校企合作项目的对接与筹款，累计拉新赞助 8 万元\n· 参与新成员面试与培训，带教 6 名新干事',
      },
      {
        title: '技能与证书',
        body: '语言：英语（CET-6 580，可商务沟通）、普通话（母语）\n工具：Excel（数据透视 / 函数）、PowerPoint、SQL、Figma\n证书：电子商务师（四级）、普通话二级甲等',
      },
    ],
  },
  {
    id: 'cv-samples-en',
    key: 'classic-en',
    label: '英文范例模板',
    group: 'minimal',
    roles: '海外 / 咨询金融',
    accent: '#2b2b2b',
    thumb: '/resume-templates/thumbs/cv-samples-en.png',
    origin: '简历 CV 6 份（英文范例集）',
    description:
      '按英文简历习惯排序的版式：教育在前、日期右对齐、动词开头。原件里另有 6 份不同专业的完整范例。',
    highlights: ['EDUCATION 前置', '日期右对齐', '动词开头'],
    file: {
      href: '/resume-templates/cv-samples-en.doc',
      name: '简历CV-6份-word 版本.doc',
      note: 'Word 原件，含 6 份英文范例',
    },
    title: 'English Resume',
    sections: [
      {
        title: 'EDUCATION',
        body: 'XX University, Shanghai, China                    Sep. 2021 – Jun. 2025\nBachelor of Management, Major in Marketing        GPA: 3.8 / 4.0\n· Relevant coursework: Consumer Behavior, Marketing Analytics, Statistics\n· Honors: First-class Scholarship (top 5%), Outstanding Graduate',
      },
      {
        title: 'WORK EXPERIENCE',
        body: 'XX Technology Co., Ltd., Shanghai, China          Jun. 2025 – Sep. 2025\nContent Operations Intern\n· Built a topic library and content calendar, publishing 12 posts per week\n· Grew the account from 0 to 21,000 followers within three months\n· Drove a 32% lift in store GMV with a best-performing post of 8,000+ interactions',
      },
      {
        title: 'RESEARCH EXPERIENCE',
        body: 'Undergraduate Research Project, XX University       Oct. 2024 – Jan. 2025\nProject Leader\n· Proposed a framework to evaluate content marketing effectiveness\n· Analyzed 1,200 posts with Python and delivered a 20-page report',
      },
      {
        title: 'ACTIVITIES & AWARDS',
        body: 'Second Prize, National Business Case Competition, 2025\nMember, Student Union, XX University, 2023 – 2024',
      },
      {
        title: 'LANGUAGES & SKILLS',
        body: 'Languages: Mandarin (Native), English (IELTS 7.0)\nComputer: Excel (Pivot Tables, Macros), PowerPoint, SQL, Python, Figma',
      },
    ],
  },
  {
    id: 'fresh-green',
    key: 'classic',
    label: '清新绿单栏',
    group: 'cn-single',
    roles: '市场 / 销售 / 运营',
    accent: '#1b5e3f',
    thumb: '/resume-templates/thumbs/fresh-green.png',
    origin: '模板库 · 推荐 2',
    description:
      '顶部深绿标题带配姓名与照片位，小节用绿色竖条标记，单栏一页装得下两段实习，末尾单列技能与自我评价。',
    highlights: ['标题带 + 照片位', '绿色竖条小节', '技能 / 自我评价分区'],
    file: {
      href: '/resume-templates/fresh-green.docx',
      name: '清新绿单栏简历.docx',
      note: 'Word 原件，可直接填写',
    },
    title: '市场销售岗简历',
    sections: skeletonCnStandard,
  },
  {
    id: 'gray-classic',
    key: 'classic',
    label: '灰调经典',
    group: 'cn-single',
    roles: '财会 / 审计 / 国企',
    accent: '#4a4a4a',
    thumb: '/resume-templates/thumbs/gray-classic.png',
    origin: '模板库 · 推荐 4',
    description: '深灰标题带配灰色竖条小节，整体配色克制、无多余装饰，适合财会、审计与国企投递。',
    highlights: ['深灰标题带', '克制配色', '通用性最强'],
    file: {
      href: '/resume-templates/gray-classic.docx',
      name: '灰调经典简历.docx',
      note: 'Word 原件，可直接填写',
    },
    title: '财务会计岗简历',
    sections: skeletonCnStandard,
  },
  {
    id: 'blue-label',
    key: 'bilingual',
    label: '蓝调标签栏',
    group: 'bilingual',
    roles: '新媒体 / 内容运营',
    accent: '#1e6bb8',
    thumb: '/resume-templates/thumbs/blue-label.png',
    origin: '模板库 · 推荐 3',
    description: '蓝色顶部横条配头像，小节用蓝底白字标签，标题中英对照，适合新媒体与内容运营岗。',
    highlights: ['蓝底白字标签', '中英对照标题', '头像位'],
    file: {
      href: '/resume-templates/blue-label.docx',
      name: '蓝调标签栏简历.docx',
      note: 'Word 原件，可直接填写',
    },
    title: '新媒体运营岗简历',
    sections: skeletonBilingual,
  },
  {
    id: 'blue-two-column',
    key: 'sidebar',
    label: '蓝调双列',
    group: 'cn-column',
    roles: '市场 / 销售 / 快消',
    accent: '#1f5fa9',
    thumb: '/resume-templates/thumbs/blue-two-column.png',
    origin: '模板库 · 推荐 5',
    description:
      '左右两列并排，左列放教育与实习，右列放证书与荣誉，同样的页面装下更多条目，适合经历密集的候选人。',
    highlights: ['双列并排', '证书独立成列', '信息密度高'],
    file: {
      href: '/resume-templates/blue-two-column.docx',
      name: '蓝调双列简历.docx',
      note: 'Word 原件，可直接填写',
    },
    title: '市场销售岗简历',
    sections: skeletonCnColumn,
  },
  {
    id: 'blue-timeline',
    key: 'sidebar',
    label: '蓝调时间轴',
    group: 'cn-column',
    roles: '互联网运营 / 产品',
    accent: '#2f6fb5',
    thumb: '/resume-templates/thumbs/blue-timeline.png',
    origin: '模板库 · 推荐 6',
    description: '左侧基本信息栏配右侧圆点时间轴，教育与实习按时间顺次展开，时间线一眼看得懂。',
    highlights: ['圆点时间轴', '左栏基本信息', '技能分条'],
    file: {
      href: '/resume-templates/blue-timeline.docx',
      name: '蓝调时间轴简历.docx',
      note: 'Word 原件，可直接填写',
    },
    title: '互联网运营岗简历',
    sections: skeletonCnColumn,
  },
  {
    id: 'dark-sidebar',
    key: 'sidebar',
    label: '深色右侧栏',
    group: 'cn-column',
    roles: '技术 / 工程 / 制造',
    accent: '#3a4a5a',
    thumb: '/resume-templates/thumbs/dark-sidebar.png',
    origin: '模板库 · 推荐 7',
    description: '主内容在左、深色侧栏在右，侧栏放姓名、基本信息、荣誉与软技能，技术岗位常见结构。',
    highlights: ['右侧深色栏', '圆形图标小节', '技术岗常用'],
    file: {
      href: '/resume-templates/dark-sidebar.docx',
      name: '深色侧栏简历.docx',
      note: 'Word 原件，可直接填写',
    },
    title: '软件开发岗简历',
    sections: skeletonCnColumn,
  },
  {
    id: 'green-sidebar',
    key: 'sidebar',
    label: '绿色侧栏双语',
    group: 'bilingual',
    roles: '广告 / 传媒 / 通用',
    accent: '#2e6b52',
    thumb: '/resume-templates/thumbs/green-sidebar.png',
    origin: '模板库 · 推荐 8',
    description:
      '左侧深绿信息表承载姓名、出生年月与联系方式，右侧主体按中英对照标题展开，信息与内容各归其位。',
    highlights: ['深绿信息表', '中英对照', 'PERSONAL RESUME 标题带'],
    file: {
      href: '/resume-templates/green-sidebar.docx',
      name: '绿色侧栏双语简历.docx',
      note: 'Word 原件，可直接填写',
    },
    title: '广告传媒岗简历',
    sections: skeletonBilingual,
  },
  {
    id: 'light-skillbar',
    key: 'sidebar',
    label: '浅蓝技能条',
    group: 'cn-column',
    roles: '市场 / 公关 / 设计',
    accent: '#5b93bb',
    thumb: '/resume-templates/thumbs/light-skillbar.png',
    origin: '模板库 · 推荐 9',
    description:
      '左栏浅蓝信息区，软件技能用进度条呈现，底部留二维码位，适合作品集型与创意岗位候选人。',
    highlights: ['技能进度条', '二维码位', '浅色轻量'],
    file: {
      href: '/resume-templates/light-skillbar.docx',
      name: '浅蓝技能条简历.docx',
      note: 'Word 原件，可直接填写',
    },
    title: '市场公关岗简历',
    sections: skeletonCnColumn,
  },
  {
    id: 'mono-bilingual',
    key: 'bilingual',
    label: '黑白双语',
    group: 'bilingual',
    roles: '财务 / 人事行政',
    accent: '#2b2b2b',
    thumb: '/resume-templates/thumbs/mono-bilingual.png',
    origin: '模板库 · 推荐 10',
    description: '黑色标题带配灰色块状小节标题，中英对照，正文以分条叙述为主，稳重不出错。',
    highlights: ['灰色块标题', '中英对照', '分条叙述'],
    file: {
      href: '/resume-templates/mono-bilingual.docx',
      name: '黑白双语简历.docx',
      note: 'Word 原件，可直接填写',
    },
    title: '财务人事岗简历',
    sections: skeletonBilingual,
  },
  {
    id: 'minimal-mono',
    key: 'compact',
    label: '极简黑白',
    group: 'minimal',
    roles: '产品 / 咨询 / 投研',
    accent: '#1a1a1a',
    thumb: '/resume-templates/thumbs/minimal-mono.png',
    origin: '模板库 · 强推极简风',
    description:
      '几乎不用色块，靠留白、加粗与右对齐日期区分层级，把版面全部让给内容，适合产品、咨询与投研。',
    highlights: ['零色块', '日期右对齐', '内容优先'],
    file: {
      href: '/resume-templates/minimal-mono.docx',
      name: '极简黑白简历.docx',
      note: 'Word 原件，可直接填写',
    },
    title: '产品经理岗简历',
    sections: skeletonMinimal,
  },
  {
    id: 'english-pro',
    key: 'classic-en',
    label: '英文专业版',
    group: 'minimal',
    roles: '外企 / 海外 / 咨询金融',
    accent: '#16357f',
    thumb: '/resume-templates/thumbs/english-pro.png',
    origin: '模板库 · 英文简历模板',
    description:
      '纯英文单栏，EDUCATION 前置、日期右对齐、每条以动词开头，按咨询与金融的投递习惯写。',
    highlights: ['EDUCATION 前置', '动词开头', '英文标点规范'],
    file: {
      href: '/resume-templates/english-pro.docx',
      name: '英文专业版简历.docx',
      note: 'Word 原件，可直接填写',
    },
    title: 'English Resume',
    sections: skeletonEnglishPro,
  },
];

/** 按官方模板生成一份新简历：套用版式、填好章节骨架，保留用户已有的姓名与邮箱。 */
export function resumeFromPreset(
  preset: ResumeTemplatePreset,
  basics: { name?: string; email?: string } = {}
): ResumeDocument {
  return {
    format: 'shangan-resume-v1',
    template: preset.key,
    basics: {
      name: basics.name ?? '',
      headline: '',
      email: basics.email ?? '',
      phone: '',
      city: '',
      links: '',
    },
    sections: preset.sections.map((section) => ({
      id: crypto.randomUUID(),
      title: section.title,
      body: section.body,
    })),
  };
}
