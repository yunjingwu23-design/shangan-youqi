'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Eye,
  MousePointer2,
  RefreshCw,
  ShieldCheck,
  Users,
  UserPlus,
} from 'lucide-react';
import {
  analyticsRange,
  beijingDate,
  dateShift,
  pageLabels,
  sourceLabels,
  type AnalyticsReport,
} from '@/lib/analytics/model';
import { jobTypes } from '@/lib/catalog';
import { adminActionLabels } from '@/lib/admin/model';
type Report = AnalyticsReport & { capabilities: { aiEnabled: boolean; liveMockEnabled: boolean } };
const number = (value: number) => new Intl.NumberFormat('zh-CN').format(value);
function Empty({ children = '此范围暂无已采集数据' }: { children?: React.ReactNode }) {
  return <div className="analytics-empty">{children}</div>;
}
function Ranking({
  title,
  note,
  rows,
}: {
  title: string;
  note: string;
  rows: { label: string; value: number; hint?: string; href?: string }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="analytics-panel">
      <div className="analytics-panel-heading">
        <h2>{title}</h2>
        <span>{note}</span>
      </div>
      {!rows.length ? (
        <Empty />
      ) : (
        <ol className="analytics-rank">
          {rows.map((row, i) => (
            <li key={row.label}>
              <span className="analytics-rank-number">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <div className="analytics-rank-line">
                  {row.href ? <Link href={row.href}>{row.label}</Link> : <span>{row.label}</span>}
                  <strong>{number(row.value)}</strong>
                </div>
                {row.hint && <small>{row.hint}</small>}
                <div className="analytics-bar">
                  <i style={{ width: (row.value / max) * 100 + '%' }} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
function Trend({ data }: { data: AnalyticsReport['trend'] }) {
  const [metric, setMetric] = useState<'pv' | 'uv' | 'new_users' | 'active_users'>('pv');
  const [hover, setHover] = useState<number | null>(null);
  const labels = {
    pv: '浏览量 PV',
    uv: '访客数 UV',
    new_users: '注册用户',
    active_users: '活跃用户',
  };
  const max = Math.ceil(Math.max(4, ...data.map((d) => d[metric])) / 4) * 4;
  const x = (i: number) =>
      data.length === 1 ? 480 : 55 + (i * 860) / Math.max(1, data.length - 1),
    y = (v: number) => 225 - (v / max) * 170;
  const path = data.map((d, i) => (i ? 'L' : 'M') + x(i) + ',' + y(d[metric])).join(' ');
  return (
    <section className="analytics-panel analytics-trend">
      <div className="analytics-panel-heading">
        <div>
          <h2>访问与增长趋势</h2>
          <span>按北京时间自然日聚合</span>
        </div>
        <div className="analytics-series" role="group" aria-label="趋势指标">
          {Object.entries(labels).map(([key, label]) => (
            <button
              key={key}
              aria-pressed={metric === key}
              onClick={() => {
                setMetric(key as typeof metric);
                setHover(null);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <svg viewBox="0 0 960 280" role="img" aria-label={labels[metric] + '趋势图'}>
        <defs>
          <linearGradient id="analytics-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4777ed" stopOpacity=".22" />
            <stop offset="100%" stopColor="#4777ed" stopOpacity=".015" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line
              x1="55"
              y1={y(max * t)}
              x2="915"
              y2={y(max * t)}
              stroke="#e9edf5"
              strokeDasharray="4 6"
            />
            <text x="43" y={y(max * t) + 4} textAnchor="end" fill="#8792a8" fontSize="12">
              {Math.round(max * t)}
            </text>
          </g>
        ))}
        {!!data.length && (
          <>
            {data.length > 1 && (
              <path
                d={`${path} L${x(data.length - 1)},225 L55,225 Z`}
                fill="url(#analytics-fill)"
              />
            )}
            <path d={path} fill="none" stroke="#4777ed" strokeWidth="3" strokeLinejoin="round" />
          </>
        )}
        {data.map((d, i) => (
          <g key={d.day} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <circle cx={x(i)} cy={y(d[metric])} r={hover === i ? 6 : 3} fill="#4777ed" />
            <circle cx={x(i)} cy={y(d[metric])} r="12" fill="transparent">
              <title>
                {d.day} · {labels[metric]} {d[metric]}
              </title>
            </circle>
            {(i === 0 ||
              i === data.length - 1 ||
              (data.length > 6 && i % Math.ceil(data.length / 6) === 0)) && (
              <text x={x(i)} y="253" textAnchor="middle" fill="#8792a8" fontSize="12">
                {d.day.slice(5).replace('-', '/')}
              </text>
            )}
          </g>
        ))}
      </svg>
      <p className="analytics-chart-caption" aria-live="polite">
        {hover === null
          ? '将鼠标移到数据点可查看当天数值'
          : `${data[hover]?.day} · ${labels[metric]} ${number(data[hover]?.[metric] || 0)}`}
      </p>
      <details className="analytics-definitions">
        <summary>查看趋势数据表</summary>
        <div className="analytics-table-scroll">
          <table>
            <thead>
              <tr>
                <th>日期</th>
                <th>PV</th>
                <th>UV</th>
                <th>注册</th>
                <th>活跃</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.day}>
                  <td>{d.day}</td>
                  <td>{number(d.pv)}</td>
                  <td>{number(d.uv)}</td>
                  <td>{number(d.new_users)}</td>
                  <td>{number(d.active_users)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
export function AdminAnalytics() {
  const today = beijingDate();
  const [preset, setPreset] = useState('7d'),
    [from, setFrom] = useState(dateShift(today, -6)),
    [to, setTo] = useState(today),
    [custom, setCustom] = useState(false);
  const [query, setQuery] = useState('preset=7d'),
    [revision, setRevision] = useState(0),
    [data, setData] = useState<Report | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setData(null);
    void fetch('/api/admin/analytics?' + query, { cache: 'no-store', signal: controller.signal })
      .then(async (r) => {
        const value = await r.json();
        if (!r.ok) throw new Error(value.error || '统计加载失败。');
        return value as Report;
      })
      .then(setData)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, revision]);
  function select(value: string) {
    setCustom(value === 'custom');
    setPreset(value);
    if (value !== 'custom') setQuery('preset=' + value);
  }
  const cards = [
    { key: 'pv' as const, label: '浏览量 PV', hint: '已采集的页面访问次数', icon: Eye },
    {
      key: 'uv' as const,
      label: '访客数 UV',
      hint: '期间去重浏览器标识，不累加每日 UV',
      icon: Users,
    },
    {
      key: 'new_users' as const,
      label: '注册用户数',
      hint: '期间创建的真实账号数',
      icon: UserPlus,
    },
    {
      key: 'active_users' as const,
      label: '活跃用户数',
      hint: '期间有采集事件的去重登录账号',
      icon: Activity,
    },
  ];
  return (
    <main className="site-main analytics-main" aria-busy={loading}>
      <div className="analytics-topline">
        <span className="analytics-eyebrow">
          <BarChart3 size={15} /> FIRST-PARTY ANALYTICS
        </span>
        <span className="analytics-live">
          <i />
          真实事件 · 北京时间
        </span>
      </div>
      <div className="analytics-title-row">
        <div>
          <h1>数据分析中心</h1>
          <p>从访问到行动，了解求职者真实的使用路径。</p>
        </div>
        <button
          className="button secondary"
          disabled={loading}
          onClick={() => setRevision((v) => v + 1)}
        >
          <RefreshCw size={16} />
          刷新数据
        </button>
      </div>
      <div className="analytics-toolbar">
        <div className="analytics-date-presets" aria-label="统计日期范围">
          {[
            ['today', '今天'],
            ['yesterday', '昨天'],
            ['7d', '近7天'],
            ['30d', '近30天'],
            ['custom', '自定义'],
          ].map(([value, label]) => (
            <button key={value} aria-pressed={preset === value} onClick={() => select(value)}>
              {label}
            </button>
          ))}
        </div>
        <span>
          <CalendarDays size={14} />
          {data ? `${data.meta.from} — ${data.meta.to}` : '最近 90 天内可选'}
        </span>
      </div>
      {custom && (
        <form
          className="analytics-custom-dates"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              const p = new URLSearchParams({ preset: 'custom', from, to });
              analyticsRange(p);
              setError('');
              setQuery(p.toString());
            } catch {
              setError('请选择最近 90 天内、开始不晚于结束的日期。');
            }
          }}
        >
          <label>
            开始日期
            <input
              type="date"
              required
              min={dateShift(today, -89)}
              max={to}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            结束日期
            <input
              type="date"
              required
              min={from}
              max={today}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <button className="button primary">应用日期</button>
        </form>
      )}
      {error && (
        <div className="site-error" role="alert">
          {error}
        </div>
      )}
      {loading && (
        <p className="analytics-loading" role="status">
          正在读取真实统计…
        </p>
      )}
      <div className="analytics-cards">
        {cards.map(({ key, label, hint, icon: Icon }) => (
          <section className="analytics-stat" key={key}>
            <div>
              <span>{label}</span>
              <Icon size={18} />
            </div>
            <strong data-metric={key}>{data ? number(data.totals[key]) : '—'}</strong>
            <small>{hint}</small>
          </section>
        ))}
      </div>
      {data && (
        <>
          <div className="analytics-coverage">
            <ShieldCheck size={17} />
            <p>
              流量及使用指标仅覆盖同意采集的访问，已排除管理页面与自动请求。采集始于{' '}
              {new Date(data.meta.startedAt).toLocaleString('zh-CN', {
                timeZone: 'Asia/Shanghai',
                hour12: false,
              })}
              ，此前无历史流量回填。
            </p>
          </div>
          <Trend data={data.trend} />
          <div className="analytics-grid-two">
            <section className="analytics-panel">
              <div className="analytics-panel-heading">
                <h2>流量来源</h2>
                <span>按页面访问次数</span>
              </div>
              {data.sources.length ? (
                <div className="analytics-sources">
                  {data.sources.map((s) => (
                    <div key={s.source}>
                      <div>
                        <span>{sourceLabels[s.source] || '其他来源'}</span>
                        <strong>
                          {number(s.views)}
                          <small>
                            {data.totals.pv ? Math.round((s.views / data.totals.pv) * 100) : 0}%
                          </small>
                        </strong>
                      </div>
                      <div className="analytics-bar">
                        <i
                          style={{
                            width: Math.max(1, (s.views / Math.max(1, data.totals.pv)) * 100) + '%',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty />
              )}
            </section>
            <Ranking
              title="热门页面"
              note="PV / 期间去重访客"
              rows={data.pages.map((p) => ({
                label: pageLabels[p.page_key] || p.page_key,
                value: p.views,
                hint: `${number(p.visitors)} 位访客`,
              }))}
            />
          </div>
          <section className="analytics-panel">
            <div className="analytics-panel-heading">
              <div>
                <h2>岗位分类表现</h2>
                <span>分类浏览包含分类列表及岗位详情；点击不代表成功投递</span>
              </div>
              <MousePointer2 size={19} />
            </div>
            <div className="analytics-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>岗位分类</th>
                    <th>分类浏览</th>
                    <th>详情浏览</th>
                    <th>分类 / 岗位点击</th>
                    <th>收藏</th>
                    <th>投递链接点击</th>
                    <th>加入工作台</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categories.map((c) => (
                    <tr key={c.category}>
                      <td>
                        <span className="analytics-category-dot" />
                        {jobTypes[c.category as keyof typeof jobTypes]}
                      </td>
                      <td>{number(c.views)}</td>
                      <td>{number(c.detail_views)}</td>
                      <td>{number(c.clicks)}</td>
                      <td>{number(c.saves)}</td>
                      <td>{number(c.application_clicks)}</td>
                      <td>{number(c.workspace_adds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <div className="analytics-grid-three">
            <Ranking
              title="热门公司"
              note="岗位详情浏览"
              rows={data.companies.map((c) => ({
                label: c.company,
                value: c.views,
                hint: `${number(c.clicks)} 次岗位点击 · ${number(c.application_clicks)} 次投递链接点击`,
              }))}
            />
            <Ranking
              title="热门岗位"
              note="岗位详情浏览"
              rows={data.jobs.map((j) => ({
                label: j.title,
                value: j.views,
                hint: `${j.company} · 收藏 ${j.saves} · 工作台 ${j.workspace_adds}`,
                href: '/admin/jobs/' + j.id,
              }))}
            />
            <Ranking
              title="热门搜索词"
              note="仅公开词表 · 至少 3 位访客"
              rows={data.keywords.map((k) => ({
                label: k.keyword,
                value: k.searches,
                hint: `${number(k.visitors)} 位访客`,
              }))}
            />
          </div>
          <div className="analytics-section-heading">
            <h2>核心功能使用</h2>
            <p>仅聚合已成功保存的操作，不读取私人内容。</p>
          </div>
          <div className="analytics-feature-grid">
            {[
              {
                title: '简历编辑器',
                tag: '已开放',
                items: [
                  ['页面访问', data.features.resume_views],
                  ['成功保存', data.features.resume_saves],
                  ['原文件上传', data.features.resume_uploads],
                ],
                note: '不采集简历文字、文件名或原件。',
              },
              {
                title: 'AI 面试复盘',
                tag: data.capabilities.aiEnabled ? '内部测试' : '默认关闭',
                items: [
                  ['页面访问', data.features.ai_views],
                  ['创建录音记录', data.features.ai_created],
                  ['报告生成请求', data.features.ai_report_requests],
                ],
                note: '请求数不等于已生成报告，不统计识别文本。',
              },
              {
                title: '真人 Mock',
                tag: '意向登记',
                items: [
                  ['页面访问', data.features.mock_views],
                  ['已保存意向', data.features.mock_interest],
                ],
                note: '导师预约尚未开放，意向不等于预约或服务完成。',
              },
            ].map((f) => (
              <section className="analytics-panel analytics-feature" key={f.title}>
                <div>
                  <h3>{f.title}</h3>
                  <span>{f.tag}</span>
                </div>
                <dl>
                  {f.items.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{number(value as number)}</dd>
                    </div>
                  ))}
                </dl>
                <p>{f.note}</p>
              </section>
            ))}
          </div>
          <section className="analytics-panel">
            <div className="analytics-panel-heading">
              <div>
                <h2>管理操作审计</h2>
                <span>复用数据库事务日志，保留账号、岗位版本与动作</span>
              </div>
              <Link href="/admin/logs">
                查看可追溯日志 <ArrowUpRight size={14} />
              </Link>
            </div>
            <div className="analytics-operation-grid">
              {data.operations.map((o) => (
                <div key={o.action}>
                  <span>{adminActionLabels[o.action] || o.action}</span>
                  <strong>{number(o.count)}</strong>
                </div>
              ))}
              {!data.operations.length && <Empty>此范围暂无管理操作</Empty>}
            </div>
          </section>
          <details className="analytics-panel analytics-definitions">
            <summary>指标口径与隐私说明</summary>
            <dl>
              <dt>PV / UV</dt>
              <dd>
                PV 为已接收的页面浏览事件；UV 为期间第一方浏览器随机标识的去重数。跨设备、清除
                Cookie 或拒绝统计会影响 UV，不能将每日 UV 相加作为期间 UV。
              </dd>
              <dt>注册 / 活跃</dt>
              <dd>
                注册数为期间实际创建账号数量；活跃数为期间有已采集事件的去重登录账号。匿名访客不计入活跃账号。日期均按北京时间，结束日期包含当天。
              </dd>
              <dt>岗位行动</dt>
              <dd>
                收藏、加入工作台仅在服务端保存成功且首次创建时计数；重复保存不重复计数。投递链接点击不代表成功投递，本系统没有招聘方的投递完成回执。
              </dd>
              <dt>搜索与数据保留</dt>
              <dd>
                仅统计公开词表中的关键词，至少三位去重访客才展示排行。查询最多 90
                天。无数据返回真实零值，加载失败显示错误。
                <Link href="/privacy">查看隐私与撤回方式</Link>。
              </dd>
            </dl>
          </details>
        </>
      )}
    </main>
  );
}
