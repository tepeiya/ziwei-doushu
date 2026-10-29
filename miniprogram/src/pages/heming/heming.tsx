import { useState } from 'react'
import { View, Text, Button } from '@tarojs/components'
import { generateChart, BRANCHES } from '@/engine'
import type { BirthInfo, ZiweiChart } from '@/engine'
import { C } from '@/theme'
import { mainStars } from '@/lib/ziwei-utils'
import BirthForm from '@/components/BirthForm'
import SectionTitle from '@/components/SectionTitle'

const DEF: BirthInfo = { year: 1990, month: 1, day: 1, hour: 0, gender: 'male', name: '甲方' }

function mingBranch(chart: ZiweiChart): number {
  return chart.palaces.find((p) => p.isMingGong)?.branch ?? 0
}
function mingStars(chart: ZiweiChart): string {
  const ming = chart.palaces.find((p) => p.isMingGong)
  return ming ? mainStars(ming).map((s) => s.name).join('、') : '—'
}

export default function HemingPage() {
  const [a, setA] = useState<BirthInfo>({ ...DEF, name: '甲方' })
  const [b, setB] = useState<BirthInfo>({ ...DEF, year: 1992, month: 6, day: 15, hour: 6, name: '乙方', gender: 'female' })
  const [charts, setCharts] = useState<[ZiweiChart, ZiweiChart] | null>(null)

  const run = () => setCharts([generateChart(a), generateChart(b)])

  const rows: { label: string; get: (c: ZiweiChart) => string }[] = [
    { label: '命宫', get: (c) => BRANCHES[mingBranch(c)] + '宫' },
    { label: '命主', get: (c) => c.mingZhu ?? '—' },
    { label: '身主', get: (c) => c.shenZhu ?? '—' },
    { label: '五行局', get: (c) => c.wuxingJuName },
    { label: '命宫主星', get: (c) => mingStars(c) }
  ]

  return (
    <View className="page">
      <View style={{ padding: '24px 24px 0' }}>
        <SectionTitle>甲方</SectionTitle>
      </View>
      <BirthForm value={a} onChange={setA} prefix="a" />

      <View style={{ padding: '20px 24px 0' }}>
        <SectionTitle>乙方</SectionTitle>
      </View>
      <BirthForm value={b} onChange={setB} prefix="b" />

      <View style={{ padding: '16px 24px 24px' }}>
        <Button
          className="btn-gold"
          style={{ background: 'linear-gradient(135deg,#d4af37,#b8941f)', color: '#1a1408', fontWeight: 600, borderRadius: 999, fontSize: 30 }}
          onClick={run}
        >
          开始合盘
        </Button>
      </View>

      {charts && (
        <View className="card col" style={{ gap: 16 }}>
          <SectionTitle>合盘比对</SectionTitle>
          <View className="row" style={{ gap: 8 }}>
            <Text style={{ flex: 1, fontSize: 22, color: C.text2 }}>项目</Text>
            <Text style={{ flex: 2, fontSize: 22, color: C.gold, fontWeight: 700 }}>{a.name || '甲方'}</Text>
            <Text style={{ flex: 2, fontSize: 22, color: C.gold, fontWeight: 700 }}>{b.name || '乙方'}</Text>
          </View>
          {rows.map((r, i) => (
            <View key={i} className="row" style={{ gap: 8, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
              <Text style={{ flex: 1, fontSize: 22, color: C.text2 }}>{r.label}</Text>
              <Text style={{ flex: 2, fontSize: 22, color: C.text }}>{r.get(charts[0])}</Text>
              <Text style={{ flex: 2, fontSize: 22, color: C.text }}>{r.get(charts[1])}</Text>
            </View>
          ))}
          <Text className="muted" style={{ fontSize: 20, marginTop: 8 }}>
            合盘基于两人命盘结构化数据比对。更深的「倪师合命」方法论与关系论断，将在 v4.0 数据集接入后于 SaaS 端提供。
          </Text>
        </View>
      )}
    </View>
  )
}
