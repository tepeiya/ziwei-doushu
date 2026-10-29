// 引擎桥接：直接复用 Web 端 lib/ziwei 排盘内核（通过 @engine 别名）
// 排盘在设备端本地计算，不依赖后端。
export { generateChart } from '@engine/algorithm'
export type {
  BirthInfo,
  ZiweiChart,
  Palace,
  Star,
  LunarInfo,
  DaXian,
  SiHua,
  StarBrightness,
  SelfSihuaMark
} from '@engine/types'
export { STAR_DESCRIPTIONS, BRANCHES, STEMS } from '@engine/constants'
