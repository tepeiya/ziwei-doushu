import { View, Text, Input, Picker } from '@tarojs/components'
import { BRANCHES } from '@/engine'
import type { BirthInfo } from '@/engine'
import { C } from '@/theme'

const HOUR_RANGES = [
  '23:00-00:59', '01:00-02:59', '03:00-04:59', '05:00-06:59',
  '07:00-08:59', '09:00-10:59', '11:00-12:59', '13:00-14:59',
  '15:00-16:59', '17:00-18:59', '19:00-20:59', '21:00-22:59'
]
const hourOptions = BRANCHES.map((b, i) => `${b}时 ${HOUR_RANGES[i]}`)

interface Props {
  value: BirthInfo
  onChange: (b: BirthInfo) => void
  prefix?: string
}

export default function BirthForm({ value, onChange, prefix = '' }: Props) {
  const dateStr = `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`
  const set = (patch: Partial<BirthInfo>) => onChange({ ...value, ...patch })

  return (
    <View className="card col" style={{ gap: 22 }}>
      <View className="row between">
        <Text className="muted" style={{ fontSize: 24 }}>姓名</Text>
        <Input
          style={{ textAlign: 'right', color: C.text, width: 260, fontSize: 24 }}
          placeholder="选填"
          placeholderClass="muted"
          value={value.name ?? ''}
          onInput={(e) => set({ name: e.detail.value })}
        />
      </View>

      <View className="row between">
        <Text className="muted" style={{ fontSize: 24 }}>性别</Text>
        <View className="row" style={{ gap: 16 }}>
          {(['male', 'female'] as const).map((g) => (
            <View
              key={prefix + g}
              className={value.gender === g ? 'btn-gold' : 'btn-ghost'}
              style={{ padding: '8px 30px', fontSize: 26 }}
              onClick={() => set({ gender: g })}
            >
              <Text>{g === 'male' ? '男' : '女'}</Text>
            </View>
          ))}
        </View>
      </View>

      <Picker
        mode="date"
        value={dateStr}
        onChange={(e) => {
          const [y, m, d] = (e.detail.value as string).split('-').map(Number)
          set({ year: y, month: m, day: d })
        }}
      >
        <View className="row between">
          <Text className="muted" style={{ fontSize: 24 }}>出生日期（阳历）</Text>
          <Text style={{ color: C.text, fontSize: 24 }}>{dateStr}</Text>
        </View>
      </Picker>

      <Picker
        mode="selector"
        range={hourOptions}
        value={value.hour}
        onChange={(e) => set({ hour: Number(e.detail.value) })}
      >
        <View className="row between">
          <Text className="muted" style={{ fontSize: 24 }}>出生时辰</Text>
          <Text style={{ color: C.text, fontSize: 22 }}>{hourOptions[value.hour]}</Text>
        </View>
      </Picker>
    </View>
  )
}
