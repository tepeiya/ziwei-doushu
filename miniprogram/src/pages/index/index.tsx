import { View, Text } from '@tarojs/components'
import { C } from '@/theme'
import { openPage } from '@/lib/nav'

const MODULES = [
  { title: '排盘', desc: '命盘 · 宫位 · 星曜', url: '/pages/chart/chart', tab: true },
  { title: '合盘', desc: '双人命盘比对', url: '/pages/heming/heming', tab: true },
  { title: '流年', desc: '流年飞星运势', url: '/pages/fortune/fortune' },
  { title: '年运', desc: '年度运势命书', url: '/pages/annual/annual' },
  { title: '知识库', desc: '14 主星 × 12 宫', url: '/pages/knowledge/knowledge' },
  { title: '古籍库', desc: '紫微斗数全书', url: '/pages/library/library' },
  { title: '会员', desc: '会员 · 权益', url: '/pages/member/member', tab: true }
]

export default function IndexPage() {
  return (
    <View className="page">
      <View style={{ padding: '48px 32px 8px' }}>
        <Text style={{ fontSize: 52, fontWeight: 800, color: C.gold, letterSpacing: 4 }}>紫微斗数</Text>
        <Text className="muted" style={{ fontSize: 24, marginTop: 8, display: 'block' }}>
          命盘 · 合盘 · 流年 · 年运 · 知识
        </Text>
      </View>

      <View
        className="btn-gold"
        style={{ margin: '20px 24px', padding: '22px', textAlign: 'center' }}
        onClick={() => openPage('/pages/chart/chart')}
      >
        <Text style={{ fontSize: 30, fontWeight: 700 }}>立即排盘</Text>
      </View>

      <View style={{ display: 'flex', flexWrap: 'wrap', padding: '8px 16px 24px', gap: 16 }}>
        {MODULES.map((m) => (
          <View
            key={m.title}
            onClick={() => openPage(m.url)}
            style={{
              width: 'calc(50% - 8px)',
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 18,
              padding: '24px 20px'
            }}
          >
            <Text style={{ fontSize: 32, fontWeight: 700, color: C.text }}>{m.title}</Text>
            <Text className="muted" style={{ fontSize: 22, marginTop: 6, display: 'block' }}>
              {m.desc}
            </Text>
          </View>
        ))}
      </View>

      <Text className="muted" style={{ fontSize: 20, textAlign: 'center', padding: '8px 24px 24px', display: 'block' }}>
        排盘在本地完成，无需联网 · 解读/会员等功能需在 SaaS 接入后启用
      </Text>
    </View>
  )
}
