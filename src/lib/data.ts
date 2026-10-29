export const categories = ["日常实习", "转正实习", "秋招", "春招"] as const;
export type Category = (typeof categories)[number];
export type Job = {
  id: string;
  company: string;
  initials: string;
  color: string;
  title: string;
  city: string;
  category: Category;
  industry: string;
  department: string;
  year: string;
  salary: string;
  date: string;
  deadline: string;
  tags: string[];
  duties: string[];
  requirements: string[];
  attendance: string;
  retention?: string;
  email: string;
  subject: string;
  source: string;
};
export const jobs: Job[] = [
  {
    id: "cicc-research",
    company: "中金公司",
    initials: "CICC",
    color: "#294e75",
    title: "研究部 · 行业研究实习生",
    city: "上海",
    category: "日常实习",
    industry: "金融",
    department: "研究部",
    year: "2027届",
    salary: "150–200 元/天",
    date: "2026-10-28",
    deadline: "2026-11-30",
    tags: ["行业研究", "本科及以上", "每周4天"],
    duties: [
      "协助研究员进行行业数据收集、整理与分析，跟踪市场动态。",
      "参与行业深度研究与公司研究，协助撰写研究报告。",
      "协助完成专家访谈纪要与基础财务模型维护。",
    ],
    requirements: [
      "本科及以上在读，经济、金融、财会等相关专业优先。",
      "具有扎实的研究与数据分析能力，熟练使用 Excel。",
      "认真负责，有良好的团队协作及书面表达能力。",
    ],
    attendance: "每周至少 4 天，持续 3 个月及以上",
    email: "research-demo@example.com",
    subject: "研究实习生-学校-姓名-每周出勤天数",
    source: "https://www.cicc.com/",
  },
  {
    id: "bytedance-product",
    company: "字节跳动",
    initials: "Byte",
    color: "#283b3e",
    title: "国际化产品实习生",
    city: "北京",
    category: "转正实习",
    industry: "互联网",
    department: "国际化业务",
    year: "2027届",
    salary: "200–300 元/天",
    date: "2026-10-28",
    deadline: "2026-12-01",
    tags: ["产品策划", "英语流利", "留用机会"],
    duties: [
      "参与产品需求分析，整理用户反馈与竞品研究。",
      "协助跨团队推进需求落地，跟踪关键体验指标。",
    ],
    requirements: [
      "本科及以上在读，具备结构化思考能力。",
      "能使用英语进行日常沟通，对国际化产品感兴趣。",
    ],
    attendance: "每周至少 4 天，持续 4 个月",
    retention: "演示 JD 原文：“表现优秀的实习生有留用机会。”",
    email: "product-demo@example.com",
    subject: "产品实习-姓名-学校",
    source: "https://jobs.bytedance.com/",
  },
  {
    id: "pwc-audit",
    company: "普华永道",
    initials: "PwC",
    color: "#ab673d",
    title: "审计及鉴证 · 审计助理",
    city: "深圳",
    category: "秋招",
    industry: "专业服务",
    department: "审计及鉴证",
    year: "2027届",
    salary: "薪资面议",
    date: "2026-10-27",
    deadline: "2026-11-20",
    tags: ["校园招聘", "专业不限", "2027届"],
    duties: [
      "参与审计项目，执行审计程序与财务分析。",
      "整理工作底稿，与团队协作完成客户服务。",
    ],
    requirements: [
      "2027 届本科及以上毕业生，专业不限。",
      "具备较好的英语能力和团队合作精神。",
    ],
    attendance: "全职岗位",
    email: "audit-demo@example.com",
    subject: "校园招聘-审计助理-姓名",
    source: "https://www.pwccn.com/",
  },
  {
    id: "loreal-marketing",
    company: "欧莱雅",
    initials: "L’ORÉAL",
    color: "#272727",
    title: "品牌市场部实习生",
    city: "上海",
    category: "日常实习",
    industry: "消费品",
    department: "品牌市场部",
    year: "不限届别",
    salary: "180–200 元/天",
    date: "2026-10-27",
    deadline: "2026-11-25",
    tags: ["品牌营销", "消费品", "每周3天"],
    duties: [
      "支持品牌营销活动的策划和执行。",
      "协助内容运营、市场调研与活动复盘。",
    ],
    requirements: [
      "对美妆及消费品行业有热情。",
      "沟通表达清晰，熟练使用 Office。",
    ],
    attendance: "每周至少 3 天，持续 3 个月",
    email: "brand-demo@example.com",
    subject: "市场实习-学校-姓名",
    source: "https://careers.loreal.com/",
  },
  {
    id: "tencent-finance",
    company: "腾讯",
    initials: "Tencent",
    color: "#47729f",
    title: "财务 BP 实习生",
    city: "深圳",
    category: "转正实习",
    industry: "互联网",
    department: "财务管理",
    year: "2027届",
    salary: "200–250 元/天",
    date: "2026-10-26",
    deadline: "2026-11-28",
    tags: ["财务分析", "预算管理", "留用机会"],
    duties: [
      "支持业务预算管理，协助完成经营数据分析。",
      "参与财务分析报告整理与流程优化。",
    ],
    requirements: [
      "财务、会计或相关专业在读。",
      "具备基础财务知识和 Excel 数据处理能力。",
    ],
    attendance: "每周至少 4 天，持续 6 个月",
    retention: "演示 JD 原文：“考核通过有机会转正，以业务安排为准。”",
    email: "finance-demo@example.com",
    subject: "财务BP实习-学校-姓名",
    source: "https://careers.tencent.com/",
  },
  {
    id: "deloitte-consulting",
    company: "德勤",
    initials: "Deloitte.",
    color: "#4c653e",
    title: "管理咨询分析师",
    city: "北京",
    category: "春招",
    industry: "专业服务",
    department: "管理咨询",
    year: "2027届",
    salary: "薪资面议",
    date: "2026-10-25",
    deadline: "2027-03-31",
    tags: ["春招预告", "商业分析", "2027届"],
    duties: [
      "协助进行行业研究、商业分析和客户访谈。",
      "与项目团队共同准备报告和演示材料。",
    ],
    requirements: [
      "本科及以上，逻辑清晰，具备问题解决能力。",
      "具备良好的中英文沟通能力。",
    ],
    attendance: "全职岗位；演示批次，时间未经官方核验",
    email: "consulting-demo@example.com",
    subject: "春招咨询分析师-姓名",
    source: "https://www.deloitte.com/",
  },
  {
    id: "ey-tax",
    company: "安永",
    initials: "EY",
    color: "#8b7b27",
    title: "税务咨询实习生",
    city: "广州",
    category: "日常实习",
    industry: "专业服务",
    department: "税务咨询",
    year: "不限届别",
    salary: "150–180 元/天",
    date: "2026-10-24",
    deadline: "2026-11-30",
    tags: ["税务咨询", "本科及以上", "每周3天"],
    duties: ["协助研究税务政策和整理客户资料。"],
    requirements: ["财税相关专业，认真细致。"],
    attendance: "每周至少 3 天",
    email: "tax-demo@example.com",
    subject: "税务实习-姓名",
    source: "https://www.ey.com/",
  },
  {
    id: "kpmg-risk",
    company: "毕马威",
    initials: "KPMG",
    color: "#455589",
    title: "风险咨询顾问",
    city: "上海",
    category: "秋招",
    industry: "专业服务",
    department: "风险咨询",
    year: "2027届",
    salary: "薪资面议",
    date: "2026-10-23",
    deadline: "2026-11-30",
    tags: ["风险咨询", "校园招聘", "2027届"],
    duties: ["协助开展企业风险评估与研究。"],
    requirements: ["本科及以上，具有分析与沟通能力。"],
    attendance: "全职岗位",
    email: "risk-demo@example.com",
    subject: "风险咨询-姓名",
    source: "https://kpmg.com/",
  },
];
export const companyAliases: Record<string, string[]> = {
  中金公司: ["中金", "CICC", "中国国际金融股份有限公司"],
  字节跳动: ["字节", "ByteDance"],
  腾讯: ["Tencent"],
  普华永道: ["PwC", "四大"],
  德勤: ["Deloitte", "四大"],
  安永: ["EY", "四大"],
  毕马威: ["KPMG", "四大"],
  欧莱雅: ["L’Oréal", "Loreal"],
};
export const roleSynonyms: Record<string, string[]> = {
  财务: ["财务BP", "财务分析", "财务会计", "账务"],
  产品: ["产品策划", "产品经理"],
  咨询: ["商业分析", "管理咨询", "风险咨询"],
  研究: ["行业研究", "投研"],
};
export type Post = {
  id: string;
  company: string;
  title: string;
  category: string;
  time: string;
  summary: string;
  questions: string[];
};
export const posts: Post[] = [
  {
    id: "research-prep",
    company: "中金公司",
    title: "行业研究面试，如何搭建你的分析框架？",
    category: "研究 / 一面",
    time: "8 分钟阅读",
    summary: "从行业空间到公司竞争力，用清晰的框架讲好你的研究逻辑。",
    questions: [
      "你会如何估算一个行业的市场规模？",
      "如何从财务报表中识别企业的竞争优势？",
      "选择一家你关注的公司，介绍你的研究思路。",
    ],
  },
  {
    id: "product-prep",
    company: "字节跳动",
    title: "产品实习生面试：把项目经历讲具体",
    category: "产品 / 业务面",
    time: "6 分钟阅读",
    summary: "用目标、决策与结果组织项目故事，让每一步选择都有依据。",
    questions: [
      "项目中你解决了什么用户问题？",
      "你如何确定需求优先级？",
      "如果重新做一次，你会改变什么？",
    ],
  },
  {
    id: "audit-prep",
    company: "普华永道",
    title: "四大校招准备：从自我介绍到案例分析",
    category: "审计 / 群面",
    time: "5 分钟阅读",
    summary: "从基础问题开始，建立属于自己的表达节奏。",
    questions: [
      "为什么选择审计？",
      "你如何应对紧迫的项目截止时间？",
      "描述一次你解决团队分歧的经历。",
    ],
  },
];
