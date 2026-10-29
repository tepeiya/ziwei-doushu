import { View, Text } from '@tarojs/components'
import type { ZiweiChart, Palace } from '@/engine'
import { C } from '@/theme'
import { ringOrder } from '@/lib/ziwei-utils'
import PalaceCell from './PalaceCell'

// 传统 4×4 盘：12 宫顺时针成环，中心 2×2 放命主/身主/五行局/性别
const RING: [number, number][] = [
  [0, 0], [0, 1], [0, 2], [0, 3],
  [1, 3], [2, 3], [3, 3], [3, 2],
  [3, 1], [3, 0], [2, 0], [1, 0]
]

type Cell =
  | { kind: 'palace'; p: Palace }
  | { kind: 'info'; label: string; value: string }
  | { kind: 'empty' }

export default function ChartBoard({
  chart,
  onSelectPalace
}: {
  chart: ZiweiChart
  onSelectPalace: (p: Palace) => void
}) {
  const ordered = ringOrder(chart)
  const grid: Cell[][] = [
    [{ kind: 'empty' }, { kind: 'empty' }, { kind: 'empty' }, { kind: 'empty' }],
    [{ kind: 'empty' }, { kind: 'empty' }, { kind: 'empty' }, { kind: 'empty' }],
    [{ kind: 'empty' }, { kind: 'empty' }, { kind: 'empty' }, { kind: 'empty' }],
    [{ kind: 'empty' }, { kind: 'empty' }, { kind: 'empty' }, { kind: 'empty' }]
  ]

  ordered.forEach((p, i) => {
    const [r, c] = RING[i]
    grid[r][c] = { kind: 'palace', p }
  })

  const centerItems = [
    { label: '命主', value: chart.mingZhu ?? '—' },
    { label: '身主', value: chart.shenZhu ?? '—' },
    { label: '五行局', value: chart.wuxingJuName },
    { label: '性别', value: chart.yinYangGender ?? (chart.birthInfo.gender === 'male' ? '乾造' : '坤造') }
  ]
  const centers: [number, number][] = [[1, 1], [1, 2], [2, 1], [2, 2]]
  centers.forEach(([r, c], i) => {
    grid[r][c] = { kind: 'info', ...centerItems[i] }
  })

  return (
    <View style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {grid.map((row, r) => (
        <View key={r} style={{ display: 'flex', gap: 6 }}>
          {row.map((cell, c) => {
            if (cell.kind === 'palace') {
              return <PalaceCell key={`${r}${c}`} palace={cell.p} onClick={() => onSelectPalace(cell.p)} />
            }
            if (cell.kind === 'info') {
              return (
                <View
                  key={`${r}${c}`}
                  style={{
                    flex: 1,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    padding: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    minHeight: 132
                  }}
                >
                  <Text style={{ fontSize: 16, color: C.text2 }}>{cell.label}</Text>
                  <Text style={{ fontSize: 24, color: C.gold, fontWeight: 700 }}>{cell.value}</Text>
                </View>
              )
            }
            return <View key={`${r}${c}`} style={{ flex: 1, minHeight: 132 }} />
          })}
        </View>
      ))}
    </View>
  )
}
