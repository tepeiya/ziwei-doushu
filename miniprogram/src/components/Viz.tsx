import { View, Text, ScrollView } from '@tarojs/components'
import type { ZiweiChart } from '@/engine'
import { C, WUXING } from '@/theme'
import { wuxingCounts, majorBrightnessList, brightnessColor } from '@/lib/ziwei-utils'
import SectionTitle from './SectionTitle'

export default function Viz({ chart }: { chart: ZiweiChart }) {
  const counts = wuxingCounts(chart)
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1
  const majors = majorBrightnessList(chart)
  const dx = chart.daXians

  return (
    <View className="card col" style={{ gap: 26 }}>
      <View className="col" style={{ gap: 12 }}>
        <SectionTitle>主星五行分布</SectionTitle>
        {Object.entries(counts).map(([el, n]) => (
          <View key={el} className="col" style={{ gap: 5 }}>
            <View className="row between">
              <Text style={{ fontSize: 22, color: C.text }}>{el}</Text>
              <Text style={{ fontSize: 20, color: C.text2 }}>{n}</Text>
            </View>
            <View style={{ height: 14, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <View style={{ width: `${(n / total) * 100}%`, height: '100%', background: WUXING[el as keyof typeof WUXING] }} />
            </View>
          </View>
        ))}
      </View>

      <View className="col" style={{ gap: 12 }}>
        <SectionTitle>星曜亮度概览</SectionTitle>
        <View className="wrap" style={{ gap: 14 }}>
          {majors.map((m, i) => (
            <View key={i} className="row" style={{ gap: 6, alignItems: 'center' }}>
              <View style={{ width: 16, height: 16, borderRadius: 4, background: brightnessColor(m.brightness), flexShrink: 0 }} />
              <Text style={{ fontSize: 22, color: C.text }}>{m.name}</Text>
              <Text style={{ fontSize: 18, color: C.text2 }}>{m.brightness ?? '—'}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="col" style={{ gap: 12 }}>
        <SectionTitle>大运时间轴</SectionTitle>
        <ScrollView scrollX style={{ width: '100%' }} className="col">
          <View className="row" style={{ gap: 10, paddingBottom: 8 }}>
            {dx.map((d, i) => {
              const active = i === chart.currentDaXianIndex
              return (
                <View
                  key={i}
                  className="col"
                  style={{
                    gap: 2,
                    padding: '10px 16px',
                    borderRadius: 12,
                    border: `1px solid ${active ? C.gold : C.border}`,
                    background: active ? 'rgba(212,175,55,0.12)' : 'transparent',
                    minWidth: 130,
                    flexShrink: 0
                  }}
                >
                  <Text style={{ fontSize: 20, color: active ? C.gold : C.text2 }}>{d.startAge}-{d.endAge}岁</Text>
                  <Text style={{ fontSize: 22, color: active ? C.gold : C.text }}>{d.palaceName}</Text>
                </View>
              )
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  )
}
