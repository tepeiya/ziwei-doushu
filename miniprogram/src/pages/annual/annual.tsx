import { useState } from 'react'
import { View, Text, Picker, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { C } from '@/theme'
import { getBirth } from '@/lib/session'
import { requestAnnual, isApiConfigured } from '@/lib/api'
import SectionTitle from '@/components/SectionTitle'

const THIS_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 6 }, (_, i) => THIS_YEAR + i)

export default function AnnualPage() {
  const birth = getBirth()
  const [yearIdx, setYearIdx] = useState(0)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  const run = async () => {
    if (!birth) {
      Taro.showToast({ title: '请先在排盘页生成命盘', icon: 'none' })
      return
    }
    setLoading(true)
    const res = await requestAnnual(birth, YEARS[yearIdx])
    setLoading(false)
    if (res.ok) setText(res.data.text)
    else setText('')
  }

  return (
    <View className="page">
      <View style={{ padding: '24px 24px 0' }}>
        <SectionTitle>年度运势命书</SectionTitle>
      </View>

      {!isApiConfigured() && (
        <View className="card">
          <Text className="muted" style={{ fontSize: 22 }}>
            年度运势 PDF 命书在 SaaS 接入后生成（配置 API_BASE）。
          </Text>
        </View>
      )}

      <View className="card col" style={{ gap: 16 }}>
        <View className="row between">
          <Text className="muted" style={{ fontSize: 24 }}>年度</Text>
          <Picker
            mode="selector"
            range={YEARS.map(String)}
            value={yearIdx}
            onChange={(e) => setYearIdx(Number(e.detail.value))}
          >
            <Text style={{ color: C.text, fontSize: 24 }}>{YEARS[yearIdx]} 年</Text>
          </Picker>
        </View>
        <Button
          className="btn-gold"
          disabled={loading}
          style={{ background: 'linear-gradient(135deg,#d4af37,#b8941f)', color: '#1a1408', fontWeight: 600, borderRadius: 999, fontSize: 28 }}
          onClick={run}
        >
          {loading ? '生成中…' : '生成年度命书'}
        </Button>
      </View>

      {text ? (
        <View className="card">
          <Text style={{ fontSize: 24, color: C.text, lineHeight: '1.7' }}>{text}</Text>
        </View>
      ) : null}
    </View>
  )
}
