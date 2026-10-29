// 墨金设计令牌（供 JS/内联样式使用，WXSS 中另用 CSS 变量）
export const C = {
  bg: '#0e0c08',
  bg2: '#161209',
  card: 'rgba(212,175,55,0.06)',
  cardSolid: '#1b160d',
  border: 'rgba(212,175,55,0.22)',
  gold: '#d4af37',
  goldDim: '#b8941f',
  text: '#ede4d3',
  text2: '#9a8f7a',
  lu: '#4ade80',
  quan: '#60a5fa',
  ke: '#facc15',
  ji: '#f87171',
  // 9 档亮度色阶：庙(最吉) → 地(最凶)
  brightness: [
    '#4ade80', // 庙
    '#7ddf6a', // 旺
    '#a3e635', // 得
    '#d9e35a', // 利
    '#facc15', // 平
    '#fbbf24', // 不
    '#fb923c', // 闲
    '#f87171', // 陷
    '#ef4444'  // 地
  ]
}

export const BRIGHTNESS_LABELS = ['庙', '旺', '得', '利', '平', '不', '闲', '陷', '地']

export const SIHUA = {
  禄: C.lu,
  权: C.quan,
  科: C.ke,
  忌: C.ji
}

export const WUXING = {
  木: '#4ade80',
  火: '#f87171',
  土: '#d4af37',
  金: '#e5e7eb',
  水: '#60a5fa'
}
