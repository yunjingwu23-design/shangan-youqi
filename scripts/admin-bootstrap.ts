import { createClient } from '@supabase/supabase-js';
class AdminScriptError extends Error {}
async function main() {
  try {
    process.loadEnvFile('.env.local');
  } catch {}
  const email = process.argv[process.argv.indexOf('--email') + 1];
  if (!process.argv.includes('--email') || !email || !email.includes('@'))
    throw new AdminScriptError('用法：npm run admin:bootstrap -- --email 已验证邮箱');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new AdminScriptError(
      '请在可信服务端配置同项目的 Supabase URL 和服务端 key；不要把密钥发到聊天或浏览器。'
    );
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }),
    result = await db.rpc('bootstrap_site_admin', { admin_email: email });
  if (result.error) {
    const reason =
      result.error.message === 'ADMIN_BOOTSTRAPPED'
        ? '该项目已经初始化；请通过现有超级管理员邀请。'
        : result.error.message === 'ADMIN_VERIFIED_ACCOUNT_REQUIRED'
          ? '该邮箱尚未完成验证，请先在网站用邮箱验证码登录。'
          : '初始化失败，请检查目标项目、管理员迁移和服务端凭证。';
    console.error(reason);
    process.exitCode = 1;
  } else
    console.info(
      '超级管理员初始化成功。目标项目：' + new URL(url).hostname + '；请使用相同邮箱登录 /admin。'
    );
}
void main().catch((error) => {
  console.error(
    error instanceof AdminScriptError
      ? error.message
      : '后台命令执行失败，请检查服务端配置、网络与数据库迁移。'
  );
  process.exitCode = 1;
});
