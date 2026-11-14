import { preparationPayload } from './preparation';

export const PREP_PLAN_FORMAT = 'shangan-prep-plan-v1';

export type PrepTask = {
  id: string;
  title: string;
  done: boolean;
  note?: string;
};

export type PrepStage = {
  id: string;
  title: string;
  tasks: PrepTask[];
};

export type PrepPlan = {
  format: typeof PREP_PLAN_FORMAT;
  direction: string;
  jobId: string;
  jobTitle: string;
  stages: PrepStage[];
};

// 分阶段准备任务模板。按方向提供略有差异的默认清单，但核心阶段一致。
const commonStages: Omit<PrepStage, 'tasks'>[] = [
  { id: 'understand', title: '读懂 JD 与岗位' },
  { id: 'experience', title: '梳理经历与证据' },
  { id: 'questions', title: '准备高频问题' },
  { id: 'practice', title: '模拟练习' },
  { id: 'review', title: '面试复盘' },
  { id: 'wrapup', title: '收尾与核对' },
];

const directionTasks: Record<string, string[]> = {
  '互联网 / 产品': [
    '拆分 JD 中的核心职责与任职要求',
    '标注自己不熟悉、需要核实的知识点',
    '准备三个可追问的真实项目案例',
    '写清每个案例中自己的具体职责与行动',
    '准备 1 分钟自我介绍',
    '准备「项目深挖」的回答框架',
    '准备一个「需求不清晰时如何排优先级」的案例',
    '完成一次文字面试练习',
    '用录音做一次复盘并校对逐字稿',
    '面试后记录实际问答与下一步行动',
    '核对简历版本与目标岗位匹配',
    '确认投递状态与下一步时间节点',
  ],
  '技术 / 工程': [
    '拆分 JD 中的技术栈与工程要求',
    '列出需要复习或补强的知识点',
    '准备一个亲自参与的技术项目案例',
    '写清项目中最难的问题及定位过程',
    '准备 1 分钟自我介绍',
    '准备「权衡性能与可维护性」的回答',
    '准备一次线上问题/测试失败的处理经历',
    '完成一次文字面试练习',
    '用录音做一次复盘并校对逐字稿',
    '面试后记录实际问答与下一步行动',
    '核对简历上的技术栈是否真实可展开',
    '确认投递状态与下一步时间节点',
  ],
  '金融 / 财务': [
    '拆分 JD 中的专业能力要求',
    '列出需要补强的分析或研究能力',
    '准备一段与数据/研究/财务分析相关的经历',
    '写清面对不完整数据时的核对方法',
    '准备 1 分钟自我介绍',
    '准备「用非专业语言解释分析结论」的例子',
    '准备一个「时间紧张时保证准确性」的案例',
    '完成一次文字面试练习',
    '用录音做一次复盘并校对逐字稿',
    '面试后记录实际问答与下一步行动',
    '核对简历与岗位的专业匹配度',
    '确认投递状态与下一步时间节点',
  ],
  '咨询 / 商业分析': [
    '拆分 JD 中的分析框架要求',
    '列出需要练习的结构化拆解能力',
    '准备一段解决复杂问题的真实经历',
    '写清如何区分事实、假设与待验证信息',
    '准备 1 分钟自我介绍',
    '准备「陌生业务问题拆解」的思路',
    '准备一个「分析结果不支持假设」的处理案例',
    '完成一次文字面试练习',
    '用录音做一次复盘并校对逐字稿',
    '面试后记录实际问答与下一步行动',
    '核对简历中可核实的结果与口径',
    '确认投递状态与下一步时间节点',
  ],
};

const defaultTasks = [
  '拆分 JD 中的核心职责与要求',
  '标注自己不熟悉、需要核实的内容',
  '准备三个可追问的真实案例',
  '写清每个案例中自己的具体职责与行动',
  '准备 1 分钟自我介绍',
  '准备一个最能体现能力的项目回答',
  '准备一个「处理分歧或困难」的案例',
  '完成一次文字面试练习',
  '用录音做一次复盘并校对逐字稿',
  '面试后记录实际问答与下一步行动',
  '核对简历版本与目标岗位匹配',
  '确认投递状态与下一步时间节点',
];

function buildStages(direction: string): PrepStage[] {
  const tasks = directionTasks[direction] || defaultTasks;
  // 每个阶段分配 2 个任务（12 个任务 / 6 阶段）。
  return commonStages.map((stage, index) => ({
    ...stage,
    tasks: [
      { id: `${stage.id}-1`, title: tasks[index * 2], done: false },
      { id: `${stage.id}-2`, title: tasks[index * 2 + 1], done: false },
    ],
  }));
}

export function createPlan(direction: string, jobId = '', jobTitle = ''): PrepPlan {
  return {
    format: PREP_PLAN_FORMAT,
    direction,
    jobId,
    jobTitle,
    stages: buildStages(direction),
  };
}

export function parsePlan(content: string): PrepPlan | null {
  const value = preparationPayload(content);
  if (!value || typeof value !== 'object') return null;
  if (value.format !== PREP_PLAN_FORMAT) return null;
  const direction = typeof value.direction === 'string' ? value.direction : '';
  const jobId = typeof value.jobId === 'string' ? value.jobId : '';
  const jobTitle = typeof value.jobTitle === 'string' ? value.jobTitle : '';
  if (!Array.isArray(value.stages)) return null;
  const stages: PrepStage[] = [];
  for (const stage of value.stages) {
    if (!stage || typeof stage !== 'object') return null;
    const s = stage as Record<string, unknown>;
    if (typeof s.id !== 'string' || typeof s.title !== 'string' || !Array.isArray(s.tasks))
      return null;
    const tasks: PrepTask[] = [];
    for (const task of s.tasks) {
      if (!task || typeof task !== 'object') return null;
      const t = task as Record<string, unknown>;
      if (typeof t.id !== 'string' || typeof t.title !== 'string') return null;
      tasks.push({
        id: t.id,
        title: t.title,
        done: t.done === true,
        ...(typeof t.note === 'string' ? { note: t.note } : {}),
      });
    }
    stages.push({ id: s.id, title: s.title, tasks });
  }
  return { format: PREP_PLAN_FORMAT, direction, jobId, jobTitle, stages };
}

export function planProgress(plan: PrepPlan): { done: number; total: number; percent: number } {
  const total = plan.stages.reduce((sum, stage) => sum + stage.tasks.length, 0);
  const done = plan.stages.reduce(
    (sum, stage) => sum + stage.tasks.filter((task) => task.done).length,
    0
  );
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}
