import Taro from '@tarojs/taro'
import type { BirthInfo } from '@/engine'

const KEY = 'ziwei_current_birth'

// 当前正在查看的出生信息（跨页面共享，落本地存储）
export function setBirth(b: BirthInfo) {
  try {
    Taro.setStorageSync(KEY, b)
  } catch {
    /* ignore */
  }
}

export function getBirth(): BirthInfo | null {
  try {
    return Taro.getStorageSync(KEY) || null
  } catch {
    return null
  }
}
