import type { ReactNode } from 'react'
import { View, Text } from '@tarojs/components'
import { C } from '@/theme'

export default function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <View className="row" style={{ gap: 10, marginTop: 4 }}>
      <View style={{ width: 6, height: 30, borderRadius: 4, background: C.gold }} />
      <Text className="title-gold" style={{ fontSize: 30, fontWeight: 700 }}>
        {children}
      </Text>
    </View>
  )
}
