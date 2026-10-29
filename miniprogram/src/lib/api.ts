import Taro from '@tarojs/taro'
import type { BirthInfo } from '@/engine'

/**
 * SaaS 后端基地址。部署你的 Web 端（feature/commercialization 分支）后，
 * 把这里改成你的域名即可启用 AI 解读 / 流年 / 年运 / 会员 / 支付 等联网功能。
 * 留空时，相关页面会自动降级为「待接入」状态，不影响本地排盘/合盘。
 */
export const API_BASE = ''

export function isApiConfigured(): boolean {
  return typeof API_BASE === 'string' && API_BASE.length > 0
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; offline: true }

async function request<T>(path: string, method: 'GET' | 'POST' = 'GET', data?: unknown): Promise<ApiResult<T>> {
  if (!isApiConfigured()) return { ok: false, offline: true }
  try {
    const res = await Taro.request({
      url: API_BASE + path,
      method,
      data: data as any,
      header: { 'content-type': 'application/json' }
    })
    if (res.statusCode >= 200 && res.statusCode < 300) return { ok: true, data: res.data as T }
    return { ok: false, offline: true }
  } catch {
    return { ok: false, offline: true }
  }
}

// ── 业务接口（对接 Web 端既有 API，路径以 Web 端实际路由为准）──
export function requestInterpret(birth: BirthInfo, question?: string) {
  return request<{ text: string }>('/api/interpret', 'POST', { birth, question })
}

export function requestFortune(birth: BirthInfo, year: number) {
  return request<{ text: string }>(`/api/fortune?year=${year}`, 'POST', { birth })
}

export function requestAnnual(birth: BirthInfo, year: number) {
  return request<{ text: string }>(`/api/annual?year=${year}`, 'POST', { birth })
}

export function getMemberProfile() {
  return request<{ plan: string; expireAt: number | null }>('/api/member')
}

export function createOrder(payload: { plan: string; channel?: string }) {
  return request<{ orderId: string; gateway: string | null; codeUrl?: string; payUrl?: string }>(
    '/api/pay/create',
    'POST',
    payload
  )
}
