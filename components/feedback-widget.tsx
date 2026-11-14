'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CheckCircle2, MessageSquareText, Send, X } from 'lucide-react';
import { feedbackKindOptions } from '@/lib/feedback-options';

type SubmitState = 'idle' | 'sending' | 'done';

export function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<string>('suggestion');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [state, setState] = useState<SubmitState>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (open) return;
    setKind('suggestion');
    setContent('');
    setContact('');
    setError('');
    setState('idle');
  }, [open]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'sending') return;
    setError('');
    if (content.trim().length < 4) {
      setError('再多写几个字，方便我们判断问题。');
      return;
    }
    setState('sending');
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          content: content.trim(),
          contact: contact.trim() || undefined,
          pagePath: pathname,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error || '提交失败，请稍后重试。');
        setState('idle');
        return;
      }
      setState('done');
    } catch {
      setError('网络似乎不太稳定，请稍后重试。');
      setState('idle');
    }
  }

  const active = feedbackKindOptions.find((item) => item.value === kind);

  return (
    <>
      <button type="button" className="fb-trigger" onClick={() => setOpen(true)}>
        <MessageSquareText size={14} />
        意见反馈
      </button>

      {open && (
        <div className="fb-overlay" onClick={() => setOpen(false)} role="presentation">
          <div
            className="fb-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fb-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="fb-head">
              <div>
                <h2 id="fb-title">意见反馈</h2>
                <p>问题、建议、数据纠错都可以说，我们会逐条看。</p>
              </div>
              <button type="button" className="fb-close" onClick={() => setOpen(false)} aria-label="关闭">
                <X size={18} />
              </button>
            </div>

            {state === 'done' ? (
              <div className="fb-done">
                <CheckCircle2 size={26} />
                <strong>已经收到了</strong>
                <p>感谢你的反馈，我们会在后台逐条处理。如果留了联系方式，必要时会联系你。</p>
                <button type="button" className="button secondary" onClick={() => setOpen(false)}>
                  关闭
                </button>
              </div>
            ) : (
              <form className="fb-form" onSubmit={submit}>
                <div className="fb-kinds" role="radiogroup" aria-label="反馈类型">
                  {feedbackKindOptions.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      role="radio"
                      aria-checked={kind === item.value}
                      className={kind === item.value ? 'fb-kind fb-kind-active' : 'fb-kind'}
                      onClick={() => setKind(item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <label className="fb-field">
                  <span>具体说说</span>
                  <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    maxLength={2000}
                    rows={5}
                    required
                    placeholder={active?.hint || '写清楚你在哪个页面、做了什么、期望是什么'}
                  />
                  <small>{content.length} / 2000</small>
                </label>

                <label className="fb-field">
                  <span>联系方式（选填）</span>
                  <input
                    value={contact}
                    onChange={(event) => setContact(event.target.value)}
                    maxLength={120}
                    placeholder="邮箱或微信，方便我们回复你"
                  />
                </label>

                <p className="fb-page">当前页面：{pathname}</p>

                {error && <p className="fb-error">{error}</p>}

                <div className="fb-actions">
                  <button type="button" className="button secondary" onClick={() => setOpen(false)}>
                    取消
                  </button>
                  <button type="submit" className="button" disabled={state === 'sending'}>
                    <Send size={14} />
                    {state === 'sending' ? '提交中…' : '提交反馈'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
