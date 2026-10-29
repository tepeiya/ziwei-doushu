import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { STAR_DESCRIPTIONS } from '@/engine'
import { C } from '@/theme'
import SectionTitle from '@/components/SectionTitle'

// 取带五行属性的星（即 14 主星）
const MAJORS = Object.keys(STAR_DESCRIPTIONS).filter((k) => STAR_DESCRIPTIONS[k].element)

export default function KnowledgePage() {
  const [sel, setSel] = useState<string | null>(null)
  const info = sel ? STAR_DESCRIPTIONS[sel] : null

  return (
    <View className="page">
      <View style={{ padding: '24px 24px 0' }}>
        <SectionTitle>14 主星知识库</SectionTitle>
      </View>

      <View style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '16px 16px 0' }}>
        {MAJORS.map((name) => (
          <View
            key={name}
            onClick={() => setSel(name)}
            style={{
              padding: '14px 22px',
              borderRadius: 14,
              border: `1px solid ${C.border}`,
              background: sel === name ? 'rgba(212,175,55,0.12)' : C.card
            }}
          >
            <Text style={{ fontSize: 26, color: C.text }}>{name}</Text>
            <Text style={{ fontSize: 18, color: C.text2, marginLeft: 8 }}>{STAR_DESCRIPTIONS[name].element}</Text>
          </View>
        ))}
      </View>

      {info && (
        <View className="card col" style={{ gap: 10 }}>
          <Text style={{ fontSize: 32, fontWeight: 700, color: C.gold }}>
            {sel}（{info.element}）
          </Text>
          <Text style={{ fontSize: 24, color: C.text }}>关键词：{info.keywords}</Text>
          <Text style={{ fontSize: 24, color: C.text }}>性质：{info.nature}</Text>
        </View>
      )}

      {!info && (
        <Text className="muted" style={{ fontSize: 22, padding: '24px', display: 'block' }}>
          点击上方主星查看其五行、关键词与性质。
        </Text>
      )}
    </View>
  )
}
