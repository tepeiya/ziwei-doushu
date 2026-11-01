/**
 * v4.0 解读数据集离线加载器（服务端专用）。
 *
 * 数据来自仓库外置的 13 维解读数据集 v4.0（CC BY 4.0，见 DATASET-LICENSE）：
 *   目录：<cwd>/.data/ziwei-interp-v4/year-YYYY.jsonl.zst  （77 个按年份分片，zstd 压缩）
 *   每行一张盘（JSONL），键 k = `YYYY-MM-DD-时辰序号-性别`，如 `1990-01-01-0-male`。
 *
 * 注意：
 * - 文件仍是 zstd 压缩（解压后单年约 740MB），不在仓库内、不进 git（.gitignore 已忽略 .data/）。
 * - 这里用流式解压 + 提前终止：spawn `zstd -d --long=27 -c` 管道，逐行扫描，命中即 kill 进程，
 *   避免把整年文件读进内存。平均命中位置之前的解压量可接受；如需更低延迟可后续建行级索引。
 * - 数据集覆盖公历 1950–2026（仅真实日期）；范围外返回 null。
 */

import { spawn } from 'child_process';
import path from 'path';

export const V4_YEAR_MIN = 1950;
export const V4_YEAR_MAX = 2026;

const DATA_DIR = path.join(process.cwd(), '.data', 'ziwei-interp-v4');

/** 13 个维度的稳定 key 与中文标签（与数据集 c 字段一致）。 */
export const V4_DIMENSIONS: { key: string; label: string }[] = [
  { key: 'overview', label: '命格总览' },
  { key: 'personality', label: '性格' },
  { key: 'love', label: '感情' },
  { key: 'career', label: '事业' },
  { key: 'wealth', label: '财运' },
  { key: 'health', label: '健康' },
  { key: 'family', label: '兄弟' },
  { key: 'children', label: '子女' },
  { key: 'move', label: '迁移' },
  { key: 'friends', label: '人际' },
  { key: 'home', label: '田宅' },
  { key: 'spirit', label: '福德' },
  { key: 'parents', label: '父母' },
];

/**
 * 依据用户提问推断应取用的数据集维度 key。
 * 只取「当前主题对应维度」作为 LLM 底稿，避免把 13 维全文（约 2 万 token）
 * 每轮都塞进上下文，兼顾内容一致性与成本。未命中关键词时回退 overview。
 */
const DIM_KEYWORDS: { key: string; words: string[] }[] = [
  { key: 'love', words: ['感情', '婚姻', '夫妻', '桃花', '姻缘', '恋爱', '配偶', '结婚'] },
  { key: 'career', words: ['事业', '工作', '职业', '创业', '职场', '官禄', '求职', '升职'] },
  { key: 'wealth', words: ['财运', '收入', '赚钱', '理财', '财富', '财帛', '财'] },
  { key: 'health', words: ['健康', '身体', '养生', '疾病', '疾厄', '病'] },
  { key: 'personality', words: ['性格', '个性', '特质', '脾气', '为人'] },
  { key: 'family', words: ['兄弟', '合伙', '兄弟姐妹'] },
  { key: 'children', words: ['子女', '孩子', '生育', '儿女'] },
  { key: 'move', words: ['迁移', '外出', '出行', '旅行', '出差', '搬家'] },
  { key: 'friends', words: ['人际', '贵人', '朋友', '小人', '交友', '仆役', '人脉'] },
  { key: 'home', words: ['田宅', '房产', '不动产', '家宅', '买房'] },
  { key: 'spirit', words: ['福德', '精神', '内心', '心态', '信仰'] },
  { key: 'parents', words: ['父母', '长辈', '亲子', '爹妈'] },
];

export function detectV4DimensionKey(text: string): string {
  const t = text ?? '';
  for (const { key, words } of DIM_KEYWORDS) {
    if (words.some((w) => t.includes(w))) return key;
  }
  return 'overview';
}

/** 维度 key → 中文标签（用于底稿小标题）。 */
export function v4DimensionLabel(key: string): string {
  return V4_DIMENSIONS.find((d) => d.key === key)?.label ?? '命格总览';
}

export interface V4BirthKey {
  year: number;
  month: number;
  day: number;
  hour: number; // 时辰序号 0-11（子=0 … 亥=11）
  gender: 'male' | 'female';
}

export interface V4Interpretation {
  key: string;
  mingStar: string | null; // 命宫主星（空宫为 null）
  titles: Record<string, number>; // 各维字数
  content: Record<string, string>; // 13 维正文（Markdown）
}

/** 构建数据集行键 k，与 BirthInfo 直接对应（hour 即时辰序号 0-11）。 */
export function buildV4Key(b: V4BirthKey): string {
  const mm = String(b.month).padStart(2, '0');
  const dd = String(b.day).padStart(2, '0');
  return `${b.year}-${mm}-${dd}-${b.hour}-${b.gender}`;
}

function v4FilePath(year: number): string {
  return path.join(DATA_DIR, `year-${year}.jsonl.zst`);
}

/**
 * 给定出生信息，流式解压对应年份文件并查找该行解读。
 * 命中返回 V4Interpretation；未命中 / 范围外 / 解压失败返回 null。
 */
export function getV4Interpretation(b: V4BirthKey): Promise<V4Interpretation | null> {
  const year = b.year;
  if (!Number.isInteger(year) || year < V4_YEAR_MIN || year > V4_YEAR_MAX) return Promise.resolve(null);
  if (b.gender !== 'male' && b.gender !== 'female') return Promise.resolve(null);

  const key = buildV4Key(b);
  const needle = `"k":"${key}"`;
  const file = v4FilePath(year);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (val: V4Interpretation | null) => {
      if (settled) return;
      settled = true;
      try {
        zproc.kill();
      } catch {
        /* noop */
      }
      resolve(val);
    };

    let zproc: ReturnType<typeof spawn>;
    try {
      zproc = spawn('zstd', ['-d', '--long=27', '-c', file], {
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    } catch {
      finish(null);
      return;
    }

    const stdout = zproc.stdout;
    if (!stdout) {
      finish(null);
      return;
    }

    let buf = '';
    stdout.on('data', (chunk: Buffer) => {
      buf += chunk.toString('utf8');
      let nl: number;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (!line) continue;
        if (line.includes(needle)) {
          try {
            const obj = JSON.parse(line);
            finish({
              key: obj.k,
              mingStar: obj.ms ?? null,
              titles: obj.t ?? {},
              content: obj.c ?? {},
            });
            return;
          } catch {
            // 解析失败继续往下找
          }
        }
      }
    });

    stdout.on('end', () => {
      if (buf && buf.includes(needle)) {
        try {
          const obj = JSON.parse(buf);
          finish({ key: obj.k, mingStar: obj.ms ?? null, titles: obj.t ?? {}, content: obj.c ?? {} });
          return;
        } catch {
          /* noop */
        }
      }
      finish(null);
    });

    zproc.on('error', () => finish(null));

    // 兜底超时：解压卡住或文件异常时不应挂起请求
    const timer = setTimeout(() => finish(null), 30_000);
    // Node 定时器不阻止进程退出
    if (typeof timer.unref === 'function') timer.unref();
  });
}
