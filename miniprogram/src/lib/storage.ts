import Taro from '@tarojs/taro'
import type { BirthInfo } from '@/engine'

const KEY = 'ziwei_history'
const MAX = 10

export interface HistoryEntry {
  id: string
  label: string
  form: BirthInfo
  savedAt: number
}

export function getHistory(): HistoryEntry[] {
  try {
    return Taro.getStorageSync(KEY) || []
  } catch {
    return []
  }
}

export function addHistory(entry: Omit<HistoryEntry, 'id' | 'savedAt'>) {
  try {
    const list = getHistory()
    const next = [{ id: Date.now().toString(), savedAt: Date.now(), ...entry }, ...list].slice(0, MAX)
    Taro.setStorageSync(KEY, next)
  } catch {
    /* ignore */
  }
}

export function clearHistory() {
  try {
    Taro.removeStorageSync(KEY)
  } catch {
    /* ignore */
  }
}
