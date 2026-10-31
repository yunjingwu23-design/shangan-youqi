import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { admin, mailboxCode } from './helpers';
import { runInterviewTask, cleanInterviewAudio } from '../lib/interviews/worker';
import type { InterviewProvider } from '../lib/interviews/provider';

test('internal interview UI: real private upload, edit transcript, fixture AI report, history and deletion', async ({
  page,
}) => {
  test.skip(
    process.env.INTERVIEWS_ENABLED !== 'true',
    'Enable the internal test feature on the local server.'
  );
  const dir = await mkdtemp(join(tmpdir(), 'syq-browser-audio-'));
  const path = join(dir, 'legal-synthetic-test.wav');
  const email = `interview-browser-${Date.now()}@example.com`;
  const made = spawnSync('ffmpeg', [
    '-nostdin',
    '-v',
    'error',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:sample_rate=16000',
    '-t',
    '2',
    '-ac',
    '1',
    '-y',
    path,
  ]);
  expect(made.status).toBe(0);
  const provider: InterviewProvider = {
    transcribeModel: 'contract-fixture-no-live-ai',
    reviewModel: 'contract-fixture-no-live-ai',
    async transcribe() {
      return '我负责需求梳理，并与工程师确认验收标准。';
    },
    async report(input) {
      const segment = input.segments[0];
      return {
        inputTokens: 1000,
        outputTokens: 500,
        body: {
          summary: '这是一份用于测试保存流程的复盘，不代表真实模型输出质量。',
          observations: [
            {
              category: '项目证据',
              finding: '逐字稿描述了需求梳理。',
              evidence: [{ segment_id: segment.id, quote: segment.text }],
              suggestion: '准备一个真实的验收标准例子。',
              uncertainty: '未提供项目结果。',
            },
          ],
          action_plan: [
            {
              action: '整理真实项目案例',
              reason: '补充可核实的工作细节',
              priority: 'high',
              evidence_segment_ids: [segment.id],
            },
          ],
          unknowns: ['无法判断录用结果。'],
        },
      };
    },
  };
  try {
    await page.goto('/login');
    await page.getByLabel('邮箱地址').fill(email);
    await page.getByRole('button', { name: '获取邮箱验证码' }).click();
    await expect(page.getByRole('status')).toContainText('验证码已发送');
    await page.getByLabel('邮箱验证码').fill(await mailboxCode(email));
    await page.getByRole('button', { name: '验证并进入工作台' }).click();
    await expect(page).toHaveURL('/workspace');
    await page.getByRole('link', { name: '上岸有期首页', exact: true }).click();
    await page
      .getByRole('navigation', { name: '主站导航', exact: true })
      .getByRole('link', { name: '面试中心', exact: true })
      .click();
    await page
      .getByRole('navigation', { name: '面试中心模块导航', exact: true })
      .getByRole('link', { name: 'AI 面试复盘', exact: true })
      .click();
    await expect(page.getByRole('heading', { name: '每次面试，都有下一步' })).toBeVisible();
    await page.getByRole('link', { name: '上传面试录音', exact: true }).click();
    await page.getByLabel('复盘标题').fill('产品经理 · 录音复盘内测');
    await page.getByLabel('岗位名称', { exact: true }).fill('产品经理');
    await page.getByLabel('公司（选填）').fill('内测公司');
    await page.locator('input[type=file]').setInputFiles(path);
    await expect(page.getByText('上传前，请确认录音授权')).toBeVisible();
    await page.getByRole('button', { name: '上传并开始转写' }).click();
    await expect(page).toHaveURL(/\/new$/);
    await page
      .getByRole('navigation', { name: '主站导航', exact: true })
      .getByRole('link', { name: '找岗位', exact: true })
      .click();
    await expect(page).toHaveURL('/jobs');
    await page.getByRole('button', { name: '返回上一页', exact: true }).click();
    await expect(page.getByLabel('复盘标题')).toHaveValue('产品经理 · 录音复盘内测');
    await expect(page.getByText('legal-synthetic-test.wav', { exact: true })).toBeVisible();
    await page.getByRole('checkbox', { name: /我确认录音来源合法/ }).check();
    await page.screenshot({ path: 'test-results/interview-upload.png', fullPage: true });
    await page.getByRole('button', { name: '上传并开始转写' }).click();
    await expect(page).toHaveURL(/\/progress$/);
    await expect(
      page.getByRole('navigation', { name: '主站导航', exact: true }).getByRole('link')
    ).toHaveCount(4);
    await expect(
      page
        .getByRole('navigation', { name: '主站导航', exact: true })
        .getByRole('link', { name: '面试中心', exact: true })
    ).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { name: '排队中' })).toBeVisible();
    await runInterviewTask(admin, provider);
    await expect(page.getByRole('heading', { name: '待校对' })).toBeVisible();
    await page.getByRole('link', { name: '校对逐字稿', exact: true }).click();
    await page.getByRole('button', { name: '播放原录音' }).click();
    await expect(page.locator('audio')).toBeVisible();
    await page.getByLabel('第 1 段说话人').fill('候选人');
    await page
      .getByLabel('第 1 段逐字稿')
      .fill('我负责需求梳理，并与工程师确认验收标准。这是人工校对后的文字。');
    await page
      .getByRole('navigation', { name: '主站导航', exact: true })
      .getByRole('link', { name: '面经资料', exact: true })
      .click();
    await expect(page).toHaveURL('/resources');
    await page.getByRole('button', { name: '返回上一页', exact: true }).click();
    await expect(page.getByLabel('第 1 段说话人')).toHaveValue('候选人');
    await expect(page.getByLabel('第 1 段逐字稿')).toHaveValue(
      '我负责需求梳理，并与工程师确认验收标准。这是人工校对后的文字。'
    );
    await page.getByRole('button', { name: '保存校对稿' }).click();
    await expect(page.getByRole('status')).toContainText('校对稿已保存');
    await page.getByRole('checkbox', { name: /我已校对当前逐字稿/ }).check();
    await page.screenshot({ path: 'test-results/interview-transcript.png', fullPage: true });
    await page.getByRole('button', { name: '确认并生成报告' }).click();
    await expect(page).toHaveURL(/\/progress$/);
    await expect(
      page.getByRole('navigation', { name: '主站导航', exact: true }).getByRole('link')
    ).toHaveCount(4);
    await expect(
      page
        .getByRole('navigation', { name: '主站导航', exact: true })
        .getByRole('link', { name: '面试中心', exact: true })
    ).toHaveAttribute('aria-current', 'page');
    await runInterviewTask(admin, provider);
    await expect(page.getByRole('heading', { name: '报告已保存' })).toBeVisible();
    await page.getByRole('link', { name: '查看已保存报告' }).click();
    await expect(page.getByRole('heading', { name: 'AI 面试复盘报告' })).toBeVisible();
    await expect(page.getByText('这是人工校对后的文字。', { exact: false }).first()).toBeVisible();
    await page.getByRole('button', { name: '编辑报告', exact: true }).click();
    await page.getByLabel('复盘概述').fill('我的人工编辑复盘总结。');
    await page
      .getByRole('navigation', { name: '主站导航', exact: true })
      .getByRole('link', { name: '找岗位', exact: true })
      .click();
    await expect(page).toHaveURL('/jobs');
    await page.getByRole('button', { name: '返回上一页', exact: true }).click();
    await expect(page.getByLabel('复盘概述')).toHaveValue('我的人工编辑复盘总结。');
    await page.getByRole('button', { name: '保存报告', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('人工编辑已保存');
    await page.reload();
    await expect(page.getByText('我的人工编辑复盘总结。', { exact: true })).toBeVisible();
    await page.screenshot({ path: 'test-results/interview-report.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    ).toBeFalsy();
    await expect(page.getByRole('navigation', { name: '移动端核心导航' })).toBeVisible();
    await expect(
      page
        .getByRole('navigation', { name: '移动端核心导航' })
        .getByRole('link', { name: '面试中心', exact: true })
    ).toHaveAttribute('aria-current', 'page');
    await page.screenshot({ path: 'test-results/interview-report-mobile.png', fullPage: true });
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: '删除录音与全部复盘数据' }).click();
    await expect(page).toHaveURL('/workspace/interviews');
    await expect(page.getByRole('heading', { name: '从一份真实录音开始' })).toBeVisible();
  } finally {
    const users = await admin.auth.admin.listUsers();
    const user = users.data.users.find((u) => u.email === email);
    if (user) await admin.auth.admin.deleteUser(user.id);
    await cleanInterviewAudio(admin);
    await rm(dir, { recursive: true, force: true });
  }
});
