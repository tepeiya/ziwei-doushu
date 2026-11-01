'use client';
import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { exportChartPdf, buildV4Section } from '@/lib/exportPdf';
import { readSseStream } from '@/lib/sse-client';
import { formatShichen } from '@/lib/ziwei/constants';
import type { ZiweiChart, Palace } from '@/lib/ziwei/types';
import type { TimeView } from './TimeNav';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  hidden?: boolean; // don't show user bubble for auto/topic messages
}

interface SelectedSiHua {
  starName: string;
  siHua: string;
  view: TimeView;
}

interface InsightPanelProps {
  chart: ZiweiChart;
  selectedPalace?: Palace | null;
  selectedSiHua?: SelectedSiHua | null;
}

/** /api/usage 返回的会员 / 试用配额 */
interface Quota {
  isMember: boolean;
  isGuest: boolean;
  trialUsed: number;
  trialLimit: number;
  trialRemaining: number | null; // 会员为 null（无限）
}

// 服务端尚未返回配额时的展示兜底（与 TRIAL_USES 默认值一致）
const DEFAULT_TRIAL = 3;

const TOPICS = [
  { key: 'overview',     label: '命格' },
  { key: 'love',        label: '感情' },
  { key: 'career',      label: '事业' },
  { key: 'wealth',      label: '财运' },
  { key: 'health',      label: '健康' },
  { key: 'personality', label: '性格' },
] as const;

const TOPIC_PROMPTS: Record<string, string> = {
  overview: `请生成命格总览，按以下结构输出：

**【命格定性】**
用一句话概括这个命盘的核心格局与命主气质。

**【主星解读】**
命宫主星的核心特质，引用传统紫微斗数原话或观点。

**【三方四正】**
财、官、迁三宫的联动分析及整体格局。

**【当前大限】**
当下大限运势方向与最值得关注的事项。

**【优势与注意】**
命盘天赋优势，以及需要注意的风险或功课。`,

  love: `请深度分析感情婚姻运，按以下结构输出：

**【感情格局】**
一句话定性感情命格。

**【夫妻宫分析】**
夫妻宫主星、四化，以及传统紫微斗数体系的具体解读。

**【三方联动】**
相关宫位对感情的影响。

**【当前大限感情运】**
当下10年感情走向与关键节点。

**【实际建议】**
具体可行的感情建议。`,

  career: `请深度分析事业运，按以下结构输出：

**【事业格局】**
一句话定性事业命格，宜任职或宜创业。

**【官禄宫分析】**
官禄宫主星、四化，以及传统技法对这种配置的判断。

**【财帛宫联动】**
财运与事业的关系，财路来源分析。

**【当前大限事业运】**
当下10年事业走向。

**【实际建议】**
适合的方向、行业与策略。`,

  wealth: `请深度分析财运，按以下结构输出：

**【财运格局】**
一句话定性财运模式，是主动财还是被动财。

**【财帛宫分析】**
财帛宫主星、四化，财富来源与流动模式。

**【田宅宫（财库）】**
积蓄能力与不动产运势分析。

**【当前大限财运】**
当下财运走向与注意事项。

**【理财建议】**
具体的财务建议。`,

  health: `请分析健康运势，按以下结构输出：

**【疾厄宫主星】**
疾厄宫星曜与健康含义。

**【主要风险】**
结合传统紫微斗数子午流注理论，分析主要健康隐患与需关注的部位。

**【大限健康走势】**
当下健康趋势与关键时间段。

**【预防建议】**
具体注意事项与养生方向。

注意：健康相关内容仅作传统养生文化角度的泛谈，不构成医疗建议，请以现代医学诊断为准。`,

  personality: `请深度解析性格特质，按以下结构输出：

**【命宫主星性格】**
命宫主星的核心性格特质，引用传统技法原话。

**【三方性格综合】**
财、官、迁三宫对性格的影响，全貌描绘。

**【人际关系模式】**
与他人互动方式、待人处世风格。

**【优势与人生课题】**
天赋优势，以及需要面对的人生功课。`,
};

const PALACE_ROLES: Record<string, string> = {
  '命宫':   '自我、性格、先天格局',
  '兄弟宫': '兄弟关系、合伙人',
  '夫妻宫': '感情关系、婚姻状态',
  '子女宫': '子女缘分、下属关系',
  '财帛宫': '财运来源、收入方式',
  '疾厄宫': '身体健康、意外',
  '迁移宫': '外出机遇、人际格局',
  '交友宫': '朋友圈、贵人、小人',
  '官禄宫': '事业成就、社会地位',
  '田宅宫': '不动产、家庭环境',
  '福德宫': '精神享受、内心福分',
  '父母宫': '父母关系、文书契约',
};

/** Render AI markdown: **【Title】** → gold header, **bold** → strong */
function AiContent({ text, streaming }: { text: string; streaming?: boolean }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        const sectionMatch = line.match(/^\*\*【(.+?)】\*\*$/);
        if (sectionMatch) {
          return (
            <div key={i} className="pt-3 pb-0.5 first:pt-0">
              <span className="text-[11px] font-semibold tracking-wide" style={{ color: 'var(--t-gold)' }}>
                【{sectionMatch[1]}】
              </span>
            </div>
          );
        }
        if (line.trim() === '') return <div key={i} className="h-1" />;
        const parts = line.split(/\*\*(.+?)\*\*/);
        return (
          <div key={i} className="text-[11px] leading-relaxed" style={{ color: 'var(--t-text2)' }}>
            {parts.map((part, j) =>
              j % 2 === 0
                ? part
                : <strong key={j} className="font-medium" style={{ color: 'var(--t-text)' }}>{part}</strong>
            )}
          </div>
        );
      })}
      {streaming && (
        <span
          className="inline-block w-1.5 h-3 ml-0.5 animate-pulse rounded-sm align-middle"
          style={{ background: 'var(--t-gold)', opacity: 0.6 }}
        />
      )}
    </div>
  );
}

export default function InsightPanel({ chart, selectedPalace, selectedSiHua }: InsightPanelProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTopic, setActiveTopic] = useState<string>('overview');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [paywall, setPaywall] = useState(false);
  const messagesRef = useRef<Message[]>([]); // always-current copy for closures
  const loadingRef = useRef(false);
  const autoLoaded = useRef(false);
  const lastPalaceBranch = useRef<number | undefined>(undefined);
  const lastSiHuaKey = useRef<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);
  // 流式响应进行中暂存的待发送 prompt（如宫位分析），响应结束后补发
  const palacePromptQueue = useRef<string | undefined>(undefined);

  // Keep refs in sync
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 拉取配额（会员 / 试用剩余），登录态变化后刷新
  // next-auth 默认 Session['user'] 不含 id，此处安全取值仅用于依赖比较
  const userId = (session?.user as { id?: string } | undefined)?.id;
  useEffect(() => {
    fetch('/api/usage')
      .then((r) => r.json())
      .then((d) => setQuota(d))
      .catch(() => {});
  }, [userId]);

  // 消费一次试用额度（成功发起解读后，本地乐观扣减，与服务端 incTrial 对齐）
  const consumeQuota = () => {
    setQuota((q) =>
      q
        ? {
            ...q,
            trialUsed: (q.trialUsed ?? 0) + 1,
            trialRemaining: q.isMember ? null : Math.max(0, (q.trialRemaining ?? 0) - 1),
          }
        : q,
    );
  };

  // 命中付费墙后从服务端重新拉取最新配额
  const refreshQuota = () => {
    fetch('/api/usage')
      .then((r) => r.json())
      .then((d) => setQuota(d))
      .catch(() => {});
  };

  // Auto-generate 命格总览 on mount
  useEffect(() => {
    if (autoLoaded.current) return;
    autoLoaded.current = true;
    sendMessage(TOPIC_PROMPTS.overview, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Inject palace analysis when palace selected
  useEffect(() => {
    if (!selectedPalace || selectedPalace.branch === lastPalaceBranch.current) return;
    lastPalaceBranch.current = selectedPalace.branch;

    const majorStars = selectedPalace.stars.filter(s => s.type === 'major');
    const starDesc = majorStars.length > 0
      ? majorStars.map(s => `${s.name}${s.siHua ? '化' + s.siHua : ''}`).join('、')
      : '空宫（借对宫）';
    const role = PALACE_ROLES[selectedPalace.name] ?? '';

    const prompt = `请重点分析【${selectedPalace.name}】（主管：${role}），该宫主星为${starDesc}，按以下结构输出：

**【宫位定性】**
${selectedPalace.name}在命盘中的意义，以及这种星曜配置的整体判断。

**【主星解读】**
主星在此宫的传统紫微斗数体系解读，引用具体观点。

**【三方四正联动】**
三方四正宫位对此宫的影响。

**【实际建议】**
基于此宫的具体建议。`;

    if (loadingRef.current) {
      // 正在流式响应时暂存，等 finally 中恢复队列，避免「点了没反应」
      palacePromptQueue.current = prompt;
      return;
    }    sendMessage(prompt, true);
  }, [selectedPalace]); // eslint-disable-line react-hooks/exhaustive-deps

  // 注入四化飞化分析
  useEffect(() => {
    if (!selectedSiHua) return;
    const key = `${selectedSiHua.starName}-${selectedSiHua.siHua}-${selectedSiHua.view}`;
    if (key === lastSiHuaKey.current) return;
    lastSiHuaKey.current = key;

    // 找出该星所在宫位
    const palaceOfStar = chart.palaces.find(p =>
      p.stars.some(s => s.name === selectedSiHua.starName)
    );
    const palaceName = palaceOfStar?.name ?? '未知宫位';
    const viewLabel = selectedSiHua.view === 'daxian' ? '大限' : '流年';

    const prompt = `请分析【${viewLabel}${selectedSiHua.starName}化${selectedSiHua.siHua}】的飞化影响，按以下结构输出：

**【化${selectedSiHua.siHua}基本含义】**
化${selectedSiHua.siHua}在传统紫微斗数体系中的核心含义，以及${selectedSiHua.starName}化${selectedSiHua.siHua}的特殊含义。

**【落宫影响】**
${selectedSiHua.starName}化${selectedSiHua.siHua}落在【${palaceName}】，该宫主管的领域受到何种影响，传统技法如何解读。

**【三方四正飞化路径】**
化${selectedSiHua.siHua}入${palaceName}后，对其三方四正（对宫、两个三合宫）的联动影响。

**【当前运势影响】**
在${viewLabel}时间维度下，此化${selectedSiHua.siHua}对命主近期运势的具体影响。

**【实际建议】**
基于此四化的具体可操作建议。`;

    sendMessage(prompt, true);
  }, [selectedSiHua]); // eslint-disable-line react-hooks/exhaustive-deps

  const streamResponse = async (apiMessages: { role: 'user' | 'assistant'; content: string }[]) => {
    let gotResponse = false; // 是否已拿到响应头，用于区分「连不上」与「读流中断」
    try {
      const res = await fetch('/api/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chart, messages: apiMessages }),
      });
      gotResponse = true;
      if (res.status === 404) throw new Error('api-missing');
      if (res.status === 402) {
        // 付费墙：服务端判定试用次数已用尽
        refreshQuota();
        setPaywall(true);
        // 移除刚乐观插入的用户气泡，避免留下没有回应的提问
        setMessages(prev =>
          prev.length && prev[prev.length - 1].role === 'user' ? prev.slice(0, -1) : prev,
        );
        throw new Error('paywall');
      }
      if (!res.ok) {
        // 透传服务端真实原因（如 429 限流、AI 供应商报错），
        // 避免一律显示「解读失败」掩盖「请求过于频繁」等可自助解决的情况。
        let msg = `解读失败（HTTP ${res.status}）`;
        try {
          const raw = await res.text();
          try {
            const j = JSON.parse(raw);
            if (j && typeof j.error === 'string' && j.error) msg = j.error;
          } catch {
            // 部分限流直接返回纯文本（如「请求过于频繁，请稍后再试」）
            const t = raw?.trim();
            if (t && t.length > 0 && t.length < 120) msg = t;
          }
        } catch { /* 读取失败则用默认文案 */ }
        throw new Error(msg);
      }
      if (!res.body) throw new Error('无响应流');

      // 切勿在 readSseStream 之前调用 res.body.getReader()：
      // 那会锁住流，readSseStream 内部再次 getReader() 会抛
      // "TypeError: ReadableStream is locked"，表现为解读失败/网络错误。
      let assistantText = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      await readSseStream(res.body, (data) => {
        if (data === '[DONE]') return;
        try {
          const delta = JSON.parse(data).delta?.text ?? '';
          assistantText += delta;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: assistantText };
            return updated;
          });
        } catch { /* skip */ }
      });
    } catch (e) {
      // 付费墙已弹窗处理，不追加失败气泡
      if (e instanceof Error && e.message === 'paywall') return;
      const missing = e instanceof Error && e.message === 'api-missing';
      let content: string;
      if (missing) {
        content = 'AI 解读服务暂未配置（/api/interpret），排盘与命盘展示不受影响。';
      } else if (!gotResponse) {
        // fetch 本身就失败了：断网 / 服务未启动 / 请求被拦截
        content = '网络连接失败，请检查网络后重试。';
      } else {
        // 展示服务端透传的真实原因（如「请求过于频繁，请稍后再试」）
        content = `解读失败：${(e as Error)?.message || '请稍后重试'}`;
      }
      setMessages(prev => [...prev, { role: 'assistant', content }]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
      // 补发流式期间被暂存的分析请求（如连点宫位）
      const pending = palacePromptQueue.current;
      palacePromptQueue.current = undefined;
      if (pending) setTimeout(() => sendMessage(pending, true), 0);
    }
  };

  const sendMessage = (text: string, hidden = false) => {
    if (!text.trim() || loadingRef.current) return;
    // 硬付费墙：非会员且试用次数用尽 → 弹窗，不再发起请求
    if (quota && !quota.isMember && (quota.trialRemaining ?? 0) <= 0) {
      setPaywall(true);
      return;
    }
    loadingRef.current = true;
    setLoading(true);

    const userMsg: Message = { role: 'user', content: text, hidden };
    // Capture current messages synchronously via ref (avoids stale closure)
    const apiMessages = [...messagesRef.current, userMsg].map(m => ({
      role: m.role,
      content: m.content,
    }));

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    consumeQuota();
    streamResponse(apiMessages);
  };

  const handleTopicClick = (topicKey: string) => {
    if (loadingRef.current) return;
    setActiveTopic(topicKey);
    sendMessage(TOPIC_PROMPTS[topicKey], true);
  };

  const handleSend = () => {
    sendMessage(input);
  };

  const exportPdf = async () => {
    if (exportingPdf) return;
    setExportingPdf(true);
    try {
      const aiText = messages.filter((m) => m.role === 'assistant').map((m) => m.content).join('\n\n');
      const b = chart.birthInfo;
      const birth = b ? `${b.year}年${b.month}月${b.day}日 ${formatShichen(b.hour)}` : '';
      // 一并拉取 v4.0 数据集的 13 维原生解读，拼在 AI 解读之后
      let text = aiText;
      if (b) {
        const v4 = await buildV4Section(b);
        if (v4) text = `${aiText}\n\n${v4}`;
      }
      await exportChartPdf({ name: b?.name || '', birth, text, chart });
    } catch (e) {
      console.error('exportChartPdf failed', e);
      setPdfError(true);
      setTimeout(() => setPdfError(false), 2500);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <>
      <div className="flex flex-col h-full rounded-xl overflow-hidden card-glass">

      {/* ── 会员 / 试用引导 ── */}
      <div
        className="flex-shrink-0 px-3 py-2 text-[10px] flex items-center justify-between gap-2"
        style={{
          background: !quota?.isMember && (quota?.trialRemaining ?? DEFAULT_TRIAL) <= 0 ? 'rgba(220,38,38,0.08)' : 'rgba(212,168,67,0.06)',
          borderBottom: '1px solid var(--t-border)',
          color: !quota?.isMember && (quota?.trialRemaining ?? DEFAULT_TRIAL) <= 0 ? '#dc2626' : 'var(--t-gold)',
        }}
      >
        {quota?.isMember ? (
          <span>会员专享 · 无限次 AI 解读 · <a href="/pricing" style={{ textDecoration: 'underline' }}>管理 / 续费</a></span>
        ) : session?.user ? (
          <span>
            免费试用剩余 <b>{quota ? quota.trialRemaining : DEFAULT_TRIAL}</b> / {quota?.trialLimit ?? DEFAULT_TRIAL} 次 ·{' '}
            <a href="/pricing" style={{ textDecoration: 'underline' }}>开通会员无限解读</a>
          </span>
        ) : (
          <span>游客可免费试用 {quota?.trialLimit ?? DEFAULT_TRIAL} 次 · 登录 / 开通会员解锁无限解读</span>
        )}
        {!session?.user && (
          <a href="/login" className="text-[10px] px-2 py-1 rounded-lg flex-shrink-0" style={{ border: '1px solid rgba(212,168,67,0.3)', color: 'var(--t-gold)' }}>登录</a>
        )}
      </div>

      {/* ── Topic buttons ── */}
      <div className="flex-shrink-0 px-2 pt-2.5 pb-2" style={{ borderBottom: '1px solid var(--t-border)' }}>
        <div className="grid grid-cols-6 gap-1">
          {TOPICS.map(t => {
            const isActive = activeTopic === t.key;
            return (
              <button
                key={t.key}
                onClick={() => handleTopicClick(t.key)}
                disabled={loading}
                className="py-1.5 text-[10px] font-medium rounded-lg transition-all duration-150 disabled:opacity-40"
                style={{
                  background: isActive ? 'rgba(212,168,67,0.12)' : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(212,168,67,0.3)' : 'var(--t-border)'}`,
                  color: isActive ? 'var(--t-gold)' : 'var(--t-faint)',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 当前分析对象上下文 ── */}
      {(selectedSiHua || selectedPalace) && (
        <div
          className="flex-shrink-0 px-3 py-2 flex items-center gap-2 text-[10px]"
          style={{ borderBottom: '1px solid var(--t-border)', background: 'rgba(212,168,67,0.05)', color: 'var(--t-gold)' }}
        >
          <span style={{ color: 'var(--t-faint)' }}>正在分析</span>
          {selectedSiHua ? (
            <span className="font-medium">
              {selectedSiHua.starName} · 化{selectedSiHua.siHua}
              <span style={{ color: 'var(--t-faint)' }}>
                （{selectedSiHua.view === 'liunian' ? '流年' : selectedSiHua.view === 'daxian' ? '大限' : '本命'}）
              </span>
            </span>
          ) : selectedPalace ? (
            <span className="font-medium">{selectedPalace.name}</span>
          ) : null}
        </div>
      )}

      {/* ── Messages ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">

        {/* Loading state before first message */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-3" style={{ color: 'var(--t-gold)', opacity: 0.1 }}>✦</div>
            <p className="text-[10px] animate-pulse" style={{ color: 'var(--t-faint)' }}>命格解读生成中…</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            if (msg.role === 'user' && msg.hidden) return null;

            if (msg.role === 'user') {
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-end"
                >
                  <div
                    className="max-w-[85%] rounded-xl px-3 py-2 text-[11px]"
                    style={{
                      background: 'rgba(212,168,67,0.08)',
                      border: '1px solid rgba(212,168,67,0.18)',
                      color: 'var(--t-gold)',
                    }}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              );
            }

            // Assistant message
            const isLastMsg = i === messages.length - 1;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div
                  className="text-[9px] tracking-widest mb-2 flex items-center gap-1.5"
                  style={{ color: 'var(--t-faint)' }}
                >
                  <span style={{ color: 'var(--t-gold)', opacity: 0.4 }}>✦</span>
                  命理解读
                </div>
                <AiContent text={msg.content} streaming={loading && isLastMsg} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ── Input ── */}
      <div className="flex-shrink-0 px-3 pb-3 pt-2" style={{ borderTop: '1px solid var(--t-border)' }}>
        <button
          onClick={exportPdf}
          disabled={exportingPdf}
          className="w-full mb-2 text-[10px] py-1.5 rounded-lg transition-all"
          style={{ border: '1px solid var(--t-border)', color: 'var(--t-faint)', opacity: exportingPdf ? 0.6 : 1, cursor: exportingPdf ? 'wait' : 'pointer' }}
        >
          {exportingPdf ? 'PDF 生成中…' : pdfError ? '生成失败，请重试' : '导出命书 PDF'}
        </button>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="继续追问，如：今年适合换工作吗？"
            disabled={loading}
            className="flex-1 rounded-lg px-3 py-2 text-[11px] focus:outline-none transition-colors"
            style={{
              background: 'var(--t-card)',
              border: '1px solid var(--t-border)',
              color: 'var(--t-text)',
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-3 py-2 rounded-lg text-[11px] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(212,168,67,0.15)',
              border: '1px solid rgba(212,168,67,0.25)',
              color: 'var(--t-gold)',
            }}
          >
            {loading ? '…' : '追问'}
          </button>
        </div>
      </div>
      </div>

      {/* ── 付费墙弹窗（fixed 覆盖视口，独立于面板 overflow，避免被裁切）── */}
      <AnimatePresence>
        {paywall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(8,6,4,0.6)', backdropFilter: 'blur(2px)' }}
            onClick={() => setPaywall(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-[380px] rounded-2xl p-6 text-center"
              style={{ background: 'var(--t-card)', border: '1px solid rgba(212,168,67,0.35)', boxShadow: '0 20px 60px rgba(0,0,0,0.45)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-3xl mb-3" style={{ color: 'var(--t-gold)' }}>🔒</div>
              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--t-text)' }}>免费试用已用完</h3>
              <p className="text-[12px] leading-relaxed mb-5" style={{ color: 'var(--t-text2)' }}>
                您已用完 {quota?.trialLimit ?? DEFAULT_TRIAL} 次免费 AI 解读。开通会员即可无限次深度解读、合盘、流年与命书导出。
              </p>
              <div className="flex flex-col gap-2">
                <a href="/pricing" onClick={() => setPaywall(false)} className="block w-full py-2.5 rounded-lg text-[13px] font-semibold" style={{ background: 'linear-gradient(135deg,#9a6210,#c88020)', color: '#fff8e8' }}>开通会员</a>
                {!session?.user && (
                  <a href="/login" onClick={() => setPaywall(false)} className="block w-full py-2.5 rounded-lg text-[13px] font-medium" style={{ border: '1px solid var(--t-border)', color: 'var(--t-text2)' }}>登录账号</a>
                )}
                <button onClick={() => setPaywall(false)} className="w-full py-2 text-[12px]" style={{ color: 'var(--t-faint)' }}>稍后再说</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
