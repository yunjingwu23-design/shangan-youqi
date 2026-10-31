import { test, expect, type Page } from '@playwright/test';
import { admin, mailboxCode, base } from './helpers';
import { stat } from 'node:fs/promises';
const main = (page: Page) => page.getByRole('navigation', { name: '主站导航', exact: true });
const sub = (page: Page, module: string) =>
  page.getByRole('navigation', { name: module + '模块导航', exact: true });
async function chrome(page: Page, active?: string) {
  await expect(main(page).getByRole('link')).toHaveCount(4);
  await expect(main(page).getByRole('link')).toHaveText([
    '找岗位',
    '我的求职',
    '面试中心',
    '面经资料',
  ]);
  await expect(page.getByRole('img', { name: '上岸有期官方 Logo' })).toBeVisible();
  if (active)
    await expect(main(page).getByRole('link', { name: active, exact: true })).toHaveAttribute(
      'aria-current',
      'page'
    );
}
async function login(page: Page, email: string) {
  await page.getByLabel('邮箱地址').fill(email);
  await page.getByRole('button', { name: '获取邮箱验证码' }).click();
  await expect(page.getByRole('status')).toContainText('验证码已发送');
  await page.getByLabel('邮箱验证码').fill(await mailboxCode(email));
  await page.getByRole('button', { name: /验证并/ }).click();
}
async function removeUser(email: string) {
  const users = await admin.auth.admin.listUsers();
  const user = users.data.users.find((u) => u.email === email);
  if (user) {
    const profile = await admin
      .from('app_users')
      .select('user_id')
      .eq('auth_user_id', user.id)
      .single();
    if (profile.data) {
      const files = await admin
        .from('jd_import_files')
        .select('id,file_type')
        .eq('uploaded_by', profile.data.user_id)
        .is('attached_job_id', null);
      for (const file of files.data || []) {
        await admin.storage.from('jd-originals').remove([`${file.id}.${file.file_type}`]);
        await admin.from('jd_import_files').delete().eq('id', file.id);
      }
    }
    await admin.auth.admin.deleteUser(user.id);
  }
}
test('persona 1: guest finds conversion internships in two steps, filters survive details and public guides remain open', async ({
  page,
}) => {
  await page.goto('/');
  await chrome(page);
  await expect(page.locator('.ia-action-card')).toHaveCount(4);
  await expect(page.locator('a[href^="/admin"]')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/ia-home-desktop.png', fullPage: true });
  await main(page).getByRole('link', { name: '找岗位', exact: true }).click();
  await sub(page, '找岗位').getByRole('link', { name: '转正实习', exact: true }).click();
  await expect(page).toHaveURL(/type=conversion_internship/);
  await expect(
    sub(page, '找岗位').getByRole('link', { name: '转正实习', exact: true })
  ).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText(/转正实习需明确标注有留用可能/)).toBeVisible();
  await page.locator('.job-card h2 a').first().click();
  await chrome(page, '找岗位');
  await expect(page.getByRole('navigation', { name: '面包屑' })).toContainText('岗位详情');
  await expect(page.getByText(/非实时招聘，不可用于实际投递/)).toBeVisible();
  await page.getByRole('button', { name: '返回上一页', exact: true }).click();
  await expect(page).toHaveURL(/type=conversion_internship/);
  await sub(page, '找岗位').getByRole('link', { name: '全部岗位', exact: true }).click();
  await page.getByLabel('搜索公司或岗位').fill('CICC');
  await page.getByLabel('搜索方式').selectOption('exact');
  await expect(page.getByRole('heading', { name: '没有找到匹配岗位' })).toBeVisible();
  await page.getByLabel('搜索方式').selectOption('fuzzy');
  await page.getByRole('link', { name: '投资银行实习（样品）', exact: true }).click();
  await page.getByRole('button', { name: '返回上一页', exact: true }).click();
  await expect(page.getByLabel('搜索公司或岗位')).toHaveValue('CICC');
  await expect(page.getByLabel('搜索方式')).toHaveValue('fuzzy');
  await main(page).getByRole('link', { name: '面经资料', exact: true }).click();
  await page.getByRole('link', { name: /准备三个真实案例/ }).click();
  await chrome(page, '面经资料');
  await expect(page.getByRole('navigation', { name: '面包屑' })).toContainText('面经正文');
  await expect(page).not.toHaveURL(/login/);
  await page.goto('/');
  await page.getByRole('textbox', { name: '全站搜索', exact: true }).fill('CICC');
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  await expect(page.getByRole('link', { name: /投资银行实习/ })).toBeVisible();
  await expect(page.locator('a[href^="/admin"]')).toHaveCount(0);
});
test('persona 2: logged-in table, persisted status, cloud resume, draft return, PDF and isolated resource collection', async ({
  page,
}) => {
  test.setTimeout(90000);
  page.setDefaultTimeout(15000);
  const email = `ia-career-${Date.now()}@example.com`;
  try {
    await page.goto('/resume');
    await expect(page).toHaveURL(/login\?next=/);
    await chrome(page);
    await login(page, email);
    await expect(page).toHaveURL('/resume');
    await chrome(page, '我的求职');
    await page.getByLabel('姓名', { exact: true }).fill('导航测试求职者');
    await page.getByLabel('简历标题', { exact: true }).fill('IA 云端简历');
    await page.getByLabel('项目经历内容').fill('这段真实经历在尚未保存时离开页面也应保留。');
    await main(page).getByRole('link', { name: '我的求职', exact: true }).click();
    await expect(page.locator('table')).toBeVisible();
    await sub(page, '我的求职').getByRole('link', { name: '我的简历', exact: true }).click();
    await expect(page.getByLabel('姓名', { exact: true })).toHaveValue('导航测试求职者');
    await expect(page.getByLabel('项目经历内容')).toHaveValue(
      '这段真实经历在尚未保存时离开页面也应保留。'
    );
    await page.getByRole('button', { name: '保存简历', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('简历已保存');
    const resumeUrl = page.url();
    await page.reload();
    await expect(page.getByLabel('姓名', { exact: true })).toHaveValue('导航测试求职者');
    await page.pdf({ path: 'test-results/resume-export.pdf', format: 'A4', printBackground: true });
    expect((await stat('test-results/resume-export.pdf')).size).toBeGreaterThan(1000);
    await page.screenshot({ path: 'test-results/ia-resume-desktop.png', fullPage: true });
    await page.getByRole('button', { name: '另存新版本', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('已另存为新的简历版本');
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: '删除当前版本', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('其他版本保持不变');
    await page.getByLabel('选择简历版本').selectOption({ label: 'IA 云端简历' });
    await expect(page.getByLabel('姓名', { exact: true })).toHaveValue('导航测试求职者');
    await sub(page, '我的求职').getByRole('link', { name: '求职工作台', exact: true }).click();
    console.info('IA career: resume cloud persistence, version deletion and navigation passed');
    const before = await (await page.request.get('/api/profile')).json();
    await page.getByRole('button', { name: '新增投递', exact: true }).click();
    await page.getByLabel('标题', { exact: true }).fill('IA 验收投递记录');
    await page.getByLabel('公司（选填）').fill('本地测试公司');
    await page.getByLabel('备注', { exact: true }).fill('原业务接口真实保存');
    await page.getByRole('button', { name: '保存记录', exact: true }).click();
    await page.getByRole('button', { name: '编辑 IA 验收投递记录' }).click();
    await page.getByRole('combobox', { name: '状态', exact: true }).selectOption('interview');
    await page.getByRole('button', { name: '保存记录', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.reload();
    await expect(
      page
        .getByRole('region', { name: '投递记录', exact: true })
        .getByText('面试中', { exact: true })
    ).toBeVisible();
    await chrome(page, '我的求职');
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    ).toBeFalsy();
    await expect(page.getByRole('navigation', { name: '移动端核心导航' })).toBeVisible();
    await page.screenshot({ path: 'test-results/ia-workspace-mobile.png', fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    const after = await (await page.request.get('/api/profile')).json();
    expect(before.profile.user_id).toBe(after.profile.user_id);
    const entries = await (await page.request.get('/api/entries?kind=application')).json();
    expect(entries.entries.find((entry: any) => entry.title === 'IA 验收投递记录').status).toBe(
      'interview'
    );
    await page.getByRole('link', { name: '上岸有期首页', exact: true }).click();
    await expect(page.getByRole('heading', { name: '近期求职事项' })).toBeVisible();
    await page.getByRole('link', { name: /IA 验收投递记录/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: '取消', exact: true }).click();
    await sub(page, '我的求职').getByRole('link', { name: '我的简历', exact: true }).click();
    await page.getByLabel('选择简历版本').selectOption({ label: 'IA 云端简历' });
    await expect(page.getByLabel('姓名', { exact: true })).toHaveValue('导航测试求职者');
    await main(page).getByRole('link', { name: '面经资料', exact: true }).click();
    await page.getByRole('link', { name: /准备三个真实案例/ }).click();
    await page.getByRole('button', { name: '保存到我的资料', exact: true }).click();
    await page.getByRole('link', { name: '查看我的资料 →', exact: true }).click();
    await expect(page.getByRole('link', { name: /准备三个真实案例/ })).toBeVisible();
    await main(page).getByRole('link', { name: '我的求职', exact: true }).click();
    await sub(page, '我的求职').getByRole('link', { name: '收藏岗位', exact: true }).click();
    await expect(
      page.getByText('准备三个真实案例，比背十个万能答案更有用', { exact: true })
    ).toHaveCount(0);
    await page.goto('/admin');
    await expect(page.getByText(/当前账号没有运营权限/)).toBeVisible();
    expect((await page.request.get('/api/admin/jobs')).status()).toBe(403);
    console.info('IA career: application status and personal resource collection passed');
    const authorized = await admin
      .from('admin_memberships')
      .insert({ user_id: before.profile.user_id, role: 'editor' });
    expect(authorized.error).toBeNull();
    await page.goto('/admin');
    await expect(page.getByRole('navigation', { name: '后台导航' }).getByRole('link')).toHaveText([
      '内容运营',
      '服务运营',
      '数据中心',
      '系统管理',
    ]);
    await expect(page.getByRole('navigation', { name: '主站导航', exact: true })).toHaveCount(0);
    await page.getByRole('link', { name: '打开岗位管理 →', exact: true }).click();
    await page.getByRole('link', { name: /导入 \/ 新建 JD/ }).click();
    await page.getByLabel('公司', { exact: true }).fill('本地运营导航草稿');
    await page.getByLabel('手动上传 JD（TXT / DOCX / PDF）').setInputFiles({
      name: 'authorized-jd.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('本地授权测试 JD，仅验证文本导入与草稿恢复。'),
    });
    await expect(
      page.getByRole('textbox', { name: '原始 JD / 校订文本', exact: true })
    ).toHaveValue('本地授权测试 JD，仅验证文本导入与草稿恢复。');
    await page
      .getByRole('navigation', { name: '后台导航' })
      .getByRole('link', { name: '数据中心', exact: true })
      .click();
    await expect(page).toHaveURL('/admin/data');
    await page.getByRole('button', { name: '返回上一页', exact: true }).click();
    await expect(page.getByLabel('公司', { exact: true })).toHaveValue('本地运营导航草稿');
    await expect(
      page.getByRole('textbox', { name: '原始 JD / 校订文本', exact: true })
    ).toHaveValue('本地授权测试 JD，仅验证文本导入与草稿恢复。');
    await page
      .getByRole('navigation', { name: '后台导航' })
      .getByRole('link', { name: '系统管理', exact: true })
      .click();
    await expect(page.getByText('管理员身份已验证', { exact: true })).toBeVisible();
    console.info('IA career: admin JD import, drafts and system navigation passed');
    await page.goto(resumeUrl);
    await page.getByLabel('姓名', { exact: true }).fill('退出时应被清除的暂存');
    await main(page).getByRole('link', { name: '我的求职', exact: true }).click();
    await page.getByRole('button', { name: '退出登录', exact: true }).click();
    await expect(page).toHaveURL('/login');
    expect(
      await page.evaluate(
        () => Object.keys(sessionStorage).filter((key) => key.startsWith('shangan:draft:')).length
      )
    ).toBe(0);
  } finally {
    await removeUser(email);
  }
});
test('persona 3: clear Mock status, intent persistence, text practice, manual notes and one central history', async ({
  page,
}) => {
  test.setTimeout(90000);
  const email = `ia-interview-${Date.now()}@example.com`;
  try {
    await page.goto('/');
    await main(page).getByRole('link', { name: '面试中心', exact: true }).click();
    await chrome(page, '面试中心');
    await page
      .locator('.ia-hub-card')
      .filter({ has: page.getByRole('heading', { name: '真人 Mock Interview', exact: true }) })
      .click();
    await expect(page.getByText(/导师资料与预约服务尚未开放/)).toBeVisible();
    await page.getByRole('link', { name: '登录并保存服务意向 →', exact: true }).click();
    await login(page, email);
    await expect(page).toHaveURL('/interview-center/mock');
    await page.getByLabel('方便的时间（选填）').fill('周六下午');
    await page.getByLabel('希望重点练习的内容').fill('讲清楚产品项目中的个人贡献');
    await main(page).getByRole('link', { name: '找岗位', exact: true }).click();
    await expect(page).toHaveURL('/jobs');
    await page.getByRole('button', { name: '返回上一页', exact: true }).click();
    await expect(page.getByLabel('方便的时间（选填）')).toHaveValue('周六下午');
    await page.getByRole('button', { name: '保存预约意向', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('尚未确认导师或时间');
    await page.getByRole('link', { name: '先做一次文字练习 →', exact: true }).click();
    await page.getByRole('button', { name: '开始文字模拟', exact: true }).click();
    await page
      .getByRole('textbox', { name: '我的回答', exact: true })
      .fill('我负责需求梳理和验收标准确认。');
    await main(page).getByRole('link', { name: '面经资料', exact: true }).click();
    await expect(page).toHaveURL('/resources');
    await page.getByRole('button', { name: '返回上一页', exact: true }).click();
    await expect(page.getByRole('textbox', { name: '我的回答', exact: true })).toHaveValue(
      '我负责需求梳理和验收标准确认。'
    );
    await page.getByRole('button', { name: '保存本次练习', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('练习回答已保存');
    await sub(page, '面试中心').getByRole('link', { name: '我的面试历史', exact: true }).click();
    await page.getByRole('link', { name: '新建手动复盘', exact: true }).click();
    await page.getByLabel('复盘标题', { exact: true }).fill('IA 导航复盘笔记');
    await page.getByLabel('实际被问到的问题').fill('你负责了哪些工作？');
    await main(page).getByRole('link', { name: '找岗位', exact: true }).click();
    await expect(page).toHaveURL('/jobs');
    await page.getByRole('button', { name: '返回上一页', exact: true }).click();
    await expect(page.getByLabel('实际被问到的问题')).toHaveValue('你负责了哪些工作？');
    await page.getByRole('button', { name: '保存复盘笔记', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('复盘笔记已保存');
    await sub(page, '面试中心').getByRole('link', { name: '我的面试历史', exact: true }).click();
    await expect(page.getByRole('link', { name: 'IA 导航复盘笔记', exact: true })).toBeVisible();
    await expect(page.getByText('仅意向，未确认预约', { exact: false })).toBeVisible();
    await page.getByRole('link', { name: 'IA 导航复盘笔记', exact: true }).click();
    await expect(page.getByLabel('复盘标题', { exact: true })).toHaveValue('IA 导航复盘笔记');
    await chrome(page, '面试中心');
    await page.getByLabel('实际被问到的问题').fill('已有笔记返回后保留的未保存校对。');
    await main(page).getByRole('link', { name: '找岗位', exact: true }).click();
    await expect(page).toHaveURL('/jobs');
    await page.getByRole('button', { name: '返回上一页', exact: true }).click();
    await expect(page.getByLabel('实际被问到的问题')).toHaveValue(
      '已有笔记返回后保留的未保存校对。'
    );
    const historic = await page.request.post('/api/entries', {
      headers: { Origin: base },
      data: {
        kind: 'interview_review',
        title: '旧的文字练习记录',
        content: JSON.stringify({
          format: 'shangan-text-mock-v1',
          track: 'product',
          answers: ['此前记录的独立回答', '', '', '', ''],
          notes: '',
          seconds: 20,
        }),
      },
    });
    expect(historic.status()).toBe(201);
    await sub(page, '面试中心').getByRole('link', { name: '我的面试历史', exact: true }).click();
    await page.getByRole('link', { name: '旧的文字练习记录', exact: true }).click();
    await expect(page.getByRole('textbox', { name: '我的回答', exact: true })).toHaveValue(
      '此前记录的独立回答'
    );
    await page.getByRole('textbox', { name: '我的回答', exact: true }).fill('旧练习的未保存校对。');
    await main(page).getByRole('link', { name: '面经资料', exact: true }).click();
    await expect(page).toHaveURL('/resources');
    await page.getByRole('button', { name: '返回上一页', exact: true }).click();
    await expect(page.getByRole('textbox', { name: '我的回答', exact: true })).toHaveValue(
      '旧练习的未保存校对。'
    );
  } finally {
    await removeUser(email);
  }
});
test('mobile: fixed four-way navigation, nested pages, statuses and legacy route compatibility', async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto('/');
  await expect(main(page).getByRole('link', { name: '找岗位', exact: true })).toBeVisible();
  await expect(main(page).getByRole('link', { name: '面经资料', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBeFalsy();
  await page.setViewportSize({ width: 390, height: 844 });
  const nav = page.getByRole('navigation', { name: '移动端核心导航', exact: true });
  await expect(nav.getByRole('link')).toHaveCount(4);
  await expect(nav).toBeVisible();
  for (const label of ['找岗位', '面试中心', '面经资料']) {
    await nav.getByRole('link', { name: label, exact: true }).click();
    await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    ).toBeFalsy();
  }
  await page.screenshot({ path: 'test-results/ia-resources-mobile.png', fullPage: true });
  await page.getByRole('link', { name: /准备三个真实案例/ }).click();
  await expect(nav).toBeVisible();
  await expect(page.getByRole('navigation', { name: '面包屑' })).toContainText('面经正文');
  await nav.getByRole('link', { name: '找岗位', exact: true }).click();
  await sub(page, '找岗位').getByRole('link', { name: '转正实习', exact: true }).click();
  await page.locator('.job-card h2 a').first().click();
  await expect(nav).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBeFalsy();
  await page.screenshot({ path: 'test-results/ia-job-mobile.png', fullPage: true });
  for (const [old, target] of [
    ['/interviews', '/resources'],
    ['/mock', '/interview-center/mock'],
  ]) {
    await page.goto(old);
    await expect(page).toHaveURL(target);
    await expect(nav).toBeVisible();
  }
  await page.goto('/resources/radar');
  await expect(page.getByText('开发中', { exact: true })).toBeVisible();
  await page.goto('/resources/store');
  await expect(page.getByText('内容与交易筹备中', { exact: true })).toBeVisible();
  await nav.getByRole('link', { name: '我的求职', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(nav).toBeVisible();
});
