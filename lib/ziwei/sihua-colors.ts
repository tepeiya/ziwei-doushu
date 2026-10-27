/**
 * 四化 / 星曜亮度 的统一配色映射。
 *
 * 设计系统已在 globals.css 中声明四化语义色（--lu / --quan / --ke / --ji）
 * 及配套工具类（.sihua-badge 基础样式 + .badge-lu/.badge-quan/.badge-ke/.badge-ji）。
 * 此前 PalaceCell / ChartBoard / TimeNav / ChartSummary 各自硬编码了 hex / tailwind 颜色，
 * 导致明/暗主题下不一致、且 .badge-* 类成为死样式。
 *
 * 这里集中导出映射，所有组件统一引用，保证主题一致、单一事实来源。
 */

export type SiHua = '禄' | '权' | '科' | '忌';

/** 四化 → CSS 变量（主题无关，明/暗自动适配） */
export const SIHUA_VAR: Record<SiHua, string> = {
  禄: 'var(--lu)',
  权: 'var(--quan)',
  科: 'var(--ke)',
  忌: 'var(--ji)',
};

/** 四化 → 工具类（.sihua-badge 提供基础字形，.badge-* 提供色/底/边） */
export const SIHUA_BADGE: Record<SiHua, string> = {
  禄: 'badge-lu',
  权: 'badge-quan',
  科: 'badge-ke',
  忌: 'badge-ji',
};

export const SIHUA_ORDER: SiHua[] = ['禄', '权', '科', '忌'];

export type StarBrightness = '庙' | '旺' | '得' | '利' | '平' | '不' | '闲' | '陷' | '地';

/**
 * 星曜亮度（庙旺利陷）角标颜色。
 * 用设计令牌表达强弱：庙/旺/得/利 走金色（强→中），平/闲 走弱灰，
 * 不/陷 走 --ji（红，提示失陷）。全部主题无关。
 */
export const BRIGHTNESS_COLOR: Record<StarBrightness, string> = {
  庙: 'var(--t-gold)',
  旺: 'var(--t-gold)',
  得: 'var(--t-gold-dim)',
  利: 'var(--t-gold-dim)',
  平: 'var(--t-faint)',
  不: 'var(--ji)',
  闲: 'var(--t-faint)',
  陷: 'var(--ji)',
  地: 'var(--t-gold-dim)',
};

/** 亮度从强到弱的排序权重（用于可选排序，数值越小越强） */
export const BRIGHTNESS_WEIGHT: Record<StarBrightness, number> = {
  庙: 0,
  旺: 1,
  得: 2,
  利: 3,
  平: 4,
  不: 5,
  闲: 6,
  陷: 7,
  地: 3,
};
