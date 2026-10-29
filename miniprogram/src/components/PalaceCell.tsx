import { View, Text } from '@tarojs/components'
import type { Palace } from '@/engine'
import { C, SIHUA } from '@/theme'
import { brightnessColor, mainStars, minorStars } from '@/lib/ziwei-utils'

function cellStyle(p: Palace): any {
  return {
    flex: 1,
    minWidth: 0,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: 8,
    background: p.isMingGong ? 'rgba(212,175,55,0.10)' : 'rgba(212,175,55,0.03)',
    minHeight: 132
  }
}

export default function PalaceCell({ palace, onClick }: { palace: Palace; onClick?: () => void }) {
  const mains = mainStars(palace)
  const minors = minorStars(palace)
  const sihuaStar = palace.stars.find((s) => s.siHua)
  const isMing = palace.isMingGong

  return (
    <View style={cellStyle(palace)} onClick={onClick}>
      <View className="row between" style={{ alignItems: 'flex-start' }}>
        <Text style={{ fontSize: 22, color: isMing ? C.gold : C.text, fontWeight: isMing ? 700 : 400 }}>
          {palace.name}
        </Text>
        {sihuaStar?.siHua && (
          <Text style={{ fontSize: 20, color: SIHUA[sihuaStar.siHua], fontWeight: 700 }}>
            {sihuaStar.siHua}
          </Text>
        )}
      </View>

      <View className="col" style={{ gap: 2, marginTop: 4 }}>
        {mains.map((s, i) => (
          <View key={i} className="row" style={{ gap: 5, alignItems: 'center' }}>
            <View style={{ width: 10, height: 10, borderRadius: 99, background: brightnessColor(s.brightnessRaw), flexShrink: 0 }} />
            <Text style={{ fontSize: 22, color: C.text }}>{s.name}</Text>
          </View>
        ))}

        {palace.isEmpty && (
          <Text style={{ fontSize: 18, color: C.text2, marginTop: 2 }}>
            空宫 · 借{palace.borrowedFromName}
          </Text>
        )}

        {minors.length > 0 && (
          <Text style={{ fontSize: 18, color: C.text2, marginTop: 2 }}>
            {minors.map((s) => s.name).join(' ')}
          </Text>
        )}

        {palace.selfSihua && palace.selfSihua.length > 0 && (
          <Text style={{ fontSize: 16, color: C.ji, marginTop: 2 }}>
            自化{palace.selfSihua.map((x) => x.siHua).join('')}
          </Text>
        )}
      </View>
    </View>
  )
}
