'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, LoaderCircle, Mail, MessageCircle, ChevronLeft } from 'lucide-react';
import { OTP_INPUT_PATTERN, OTP_MIN_LENGTH, OTP_MAX_LENGTH } from '@/lib/otp';
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState<'email' | 'verify'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const tokenRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  useEffect(() => {
    if (step === 'verify') tokenRef.current?.focus();
  }, [step]);
  async function send() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.retryAfter) setCooldown(data.retryAfter);
        throw new Error(data.error);
      }
      setStep('verify');
      setCooldown(data.retryAfter);
      setNotice(data.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络连接失败，请重试。');
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (step === 'email') {
      await send();
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.replace('/workspace');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络连接失败，请重试。');
      setBusy(false);
    }
  }
  return (
    <>
      <form onSubmit={submit} className="auth-form">
        {step === 'verify' && (
          <button
            type="button"
            className="text-button back-button"
            onClick={() => {
              setStep('email');
              setToken('');
              setError('');
              setNotice('');
            }}
            disabled={busy}
          >
            <ChevronLeft size={14} /> 修改邮箱
          </button>
        )}
        <label htmlFor="email">邮箱地址</label>
        <div className="input-icon">
          <Mail size={18} />
          <input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
            required
            maxLength={254}
            readOnly={step === 'verify'}
          />
        </div>
        {step === 'verify' && (
          <div className="otp-field">
            <label htmlFor="token">
              邮箱验证码 <span>10 分钟内有效</span>
            </label>
            <input
              ref={tokenRef}
              id="token"
              className="otp-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern={OTP_INPUT_PATTERN}
              minLength={OTP_MIN_LENGTH}
              maxLength={OTP_MAX_LENGTH}
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
              placeholder="请输入邮件中的完整验证码"
              required
            />
            <button
              className="text-button resend"
              type="button"
              onClick={send}
              disabled={busy || cooldown > 0}
            >
              {cooldown > 0 ? `${cooldown} 秒后可重新发送` : '重新发送验证码'}
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="alert error">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="alert success">
            {notice}
          </p>
        )}
        <button
          className="button primary full"
          disabled={busy || (step === 'email' && cooldown > 0)}
          type="submit"
        >
          {busy ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <>
              {step === 'email'
                ? cooldown > 0
                  ? `${cooldown} 秒后重试`
                  : '获取邮箱验证码'
                : '验证并进入工作台'}
              <ArrowRight size={18} />
            </>
          )}
        </button>
        <p className="auth-hint">无需密码，首次验证后将自动创建账号。</p>
      </form>
      <div className="divider">
        <span>其他登录方式</span>
      </div>
      <button
        className="button wechat full"
        type="button"
        disabled
        aria-label="微信扫码登录，即将开放"
      >
        <MessageCircle size={19} />
        <span>微信扫码登录</span>
        <small>即将开放</small>
      </button>
      <details className="privacy-details">
        <summary>账号与隐私说明</summary>
        <p>
          验证邮箱即创建或登录你的账号。我们仅使用邮箱提供登录验证；个人资料与求职记录默认私有。你可以在工作台设置中修改资料、删除个人数据或注销账号。微信登录尚未开放。
        </p>
      </details>
    </>
  );
}
