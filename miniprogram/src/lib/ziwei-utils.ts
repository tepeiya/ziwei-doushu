import { C } from '@/theme'
import { STAR_DESCRIPTIONS } from '@/engine'
import type { Star, Palace, ZiweiChart } from '@/engine'

const BRIGHT_ORDER = ['庙', '旺', '得', '利', '平', '不', '闲', '陷', '地']

export function brightnessIndex(b?: string): number {
  if (!b) return 4
  const i = BRIGHT_ORDER.indexOf(b)
  return i < 0 ? 4 : i
}

export function brightnessColor(b?: string): string {
  return C.brightness[brightnessIndex(b)]
}

// 主星 + 吉星（用于宫位格主显示）
export function mainStars(p: Palace): Star[] {
  return p.stars.filter((s) => s.type === 'major' || s.type === 'lucky')
}

// 辅星 / 神煞（次要展示）
export function minorStars(p: Palace): Star[] {
  return p.stars.filter((s) => s.type === 'minor' || s.type === 'sha')
}

// 主星五行分布计数（用于可视化）
export function wuxingCounts(chart: ZiweiChart): Record<string, number> {
  const counts: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }
  for (const p of chart.palaces) {
    for (const s of p.stars) {
      if (s.type !== 'major') continue
      const el = STAR_DESCRIPTIONS[s.name]?.element
      if (el && el in counts) counts[el]++
    }
  }
  return counts
}

// 14 主星按盘内出现顺序（去重）及其亮度（用于亮度概览）
export function majorBrightnessList(chart: ZiweiChart): { name: string; brightness?: string }[] {
  const seen = new Set<string>()
  const out: { name: string; brightness?: string }[] = []
  for (const p of chart.palaces) {
    for (const s of p.stars) {
      if (s.type !== 'major') continue
      if (seen.has(s.name)) continue
      seen.add(s.name)
      out.push({ name: s.name, brightness: s.brightnessRaw })
    }
  }
  return out
}

// 将 12 宫按「命宫起、顺时针」排成环（适配 4×4 传统盘布局）
export function ringOrder(chart: ZiweiChart): Palace[] {
  const palaces = chart.palaces
  const mingIdx = palaces.findIndex((p) => p.isMingGong)
  if (mingIdx < 0) return palaces
  return [...palaces.slice(mingIdx), ...palaces.slice(0, mingIdx)]
}
