import { useState } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { generateChart, STAR_DESCRIPTIONS } from '@/engine'
import type { BirthInfo, ZiweiChart, Palace, Star } from '@/engine'
import { C, SIHUA } from '@/theme'
import { getBirth, setBirth as saveBirth } from '@/lib/session'
import { addHistory } from '@/lib/storage'
import { openPage } from '@/lib/nav'
import { brightnessColor, mainStars, minorStars } from '@/lib/ziwei-utils'
import BirthForm from '@/components/BirthForm'
import ChartBoard from '@/components/ChartBoard'
import Viz from '@/components/Viz'
import SectionTitle from '@/components/SectionTitle'

const DEFAULT_BIRTH: BirthInfo = { year: 1990, month: 6, day: 15, hour: 6, gender: 'male', name: '' }

function PalaceDetail({ palace, onClose }: { palace: Palace; onClose: () => void }) {
  const mains = mainStars(palace)
  const minors = minorStars(palace)
  return (
    <View
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        background: C.cardSolid,
        borderTop: `1px solid ${C.border}`,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: '28px 24px 40px',
        zIndex: 50
      }}
    >
      <View className="row between" style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 34, fontWeight: 700, color: C.gold }}>{palace.name}</Text>
        <Text style={{ fontSize: 26, color: C.text2 }} onClick={onClose}>✕</Text>
      </View>

      <View className="col" style={{ gap: 14 }}>
        {mains.map((s, i) => (
          <StarRow key={i} star={s} />
        ))}

        {palace.isEmpty && (
          <Text style={{ fontSize: 22, color: C.text2 }}>空宫 · 借「{palace.borrowedFromName}」之主星：{palace.borrowedStars?.join('、')}</Text>
        )}

        {minors.length > 0 && (
          <View className="col" style={{ gap: 4 }}>
            <Text className="muted" style={{ fontSize: 22 }}>辅星 / 神煞</Text>
            <Text style={{ fontSize: 22, color: C.text }}>{minors.map((s) => s.name).join(' ')}</Text>
          </View>
        )}

        {palace.selfSihua && palace.selfSihua.length > 0 && (
          <Text style={{ fontSize: 22, color: C.ji }}>宫干自化：{palace.selfSihua.map((x) => `${x.starName}${x.siHua}`).join('、')}</Text>
        )}
      </View>
    </View>
  )
}

function StarRow({ star }: { star: Star }) {
  const info = STAR_DESCRIPTIONS[star.name]
  return (
    <View className="col" style={{ gap: 4, borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
      <View className="row" style={{ gap: 8, alignItems: 'center' }}>
        <View style={{ width: 14, height: 14, borderRadius: 4, background: brightnessColor(star.brightnessRaw), flexShrink: 0 }} />
        <Text style={{ fontSize: 28, fontWeight: 600, color: C.text }}>{star.name}</Text>
        {star.brightnessRaw && <Text style={{ fontSize: 22, color: brightnessColor(star.brightnessRaw) }}>{star.brightnessRaw}</Text>}
        {star.siHua && <Text style={{ fontSize: 22, color: SIHUA[star.siHua], fontWeight: 700 }}>化{star.siHua}</Text>}
      </View>
      {info && (
        <Text className="muted" style={{ fontSize: 20 }}>
          {info.element} · {info.keywords} · {info.nature}
        </Text>
      )}
    </View>
  )
}

export default function ChartPage() {
  const saved = getBirth()
  const [draft, setDraft] = useState<BirthInfo>(saved ?? DEFAULT_BIRTH)
  const [chart, setChart] = useState<ZiweiChart | null>(saved ? generateChart(saved) : null)
  const [editing, setEditing] = useState(!saved)
  const [selected, setSelected] = useState<Palace | null>(null)

  const generate = (b: BirthInfo) => {
    const c = generateChart(b)
    saveBirth(b)
    setDraft(b)
    setChart(c)
    setEditing(false)
    setSelected(null)
    addHistory({ label: `${b.name || '命盘'} ${b.gender === 'male' ? '乾' : '坤'}造`, form: b })
  }

  if (editing || !chart) {
    return (
      <View className="page">
        <View style={{ padding: '24px 24px 0' }}>
          <SectionTitle>填写出生信息</SectionTitle>
        </View>
        <BirthForm value={draft} onChange={setDraft} />
        <View style={{ padding: '8px 24px 40px' }}>
          <Button className="btn-gold" style={{ background: 'linear-gradient(135deg,#d4af37,#b8941f)', color: '#1a1408', fontWeight: 600, borderRadius: 999, fontSize: 30 }} onClick={() => generate(draft)}>
            起盘
          </Button>
        </View>
      </View>
    )
  }

  return (
    <View className="page">
      <View style={{ padding: '20px 24px 0' }}>
        <View className="row between">
          <SectionTitle>命盘</SectionTitle>
          <Text style={{ fontSize: 24, color: C.text2 }} onClick={() => setEditing(true)}>重新排盘</Text>
        </View>
        <Text className="muted" style={{ fontSize: 22, marginTop: 4, display: 'block' }}>
          {chart.birthInfo.name ? `${chart.birthInfo.name} · ` : ''}
          {chart.birthInfo.gender === 'male' ? '乾' : '坤'}造 · {chart.lunarInfo.fourPillars?.join(' ') || ''}
        </Text>
      </View>

      <View style={{ padding: '12px 16px 0' }}>
        <ChartBoard chart={chart} onSelectPalace={setSelected} />
      </View>

      <View style={{ padding: '12px 8px 0' }}>
        <Viz chart={chart} />
      </View>

      <View style={{ display: 'flex', gap: 16, padding: '16px 24px 40px' }}>
        <View className="btn-ghost" style={{ flex: 1, padding: '18px', textAlign: 'center' }} onClick={() => openPage('/pages/heming/heming')}>
          <Text style={{ color: C.gold, fontSize: 26 }}>合盘</Text>
        </View>
        <View
          className="btn-ghost"
          style={{ flex: 1, padding: '18px', textAlign: 'center' }}
          onClick={() => Taro.showToast({ title: 'AI 解读需在 SaaS 接入后启用', icon: 'none' })}
        >
          <Text style={{ color: C.gold, fontSize: 26 }}>AI 解读</Text>
        </View>
      </View>

      {selected && <PalaceDetail palace={selected} onClose={() => setSelected(null)} />}
    </View>
  )
}
