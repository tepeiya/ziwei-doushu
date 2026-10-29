import { View, Text } from '@tarojs/components'
import { C } from '@/theme'
import SectionTitle from '@/components/SectionTitle'

const BOOKS = [
  { t: '紫微斗数全书', d: '古本集成，含星曜赋文、格局论与安星法' },
  { t: '天纪（倪师）', d: '倪海厦紫微与易经合参体系，合盘方法论来源' },
  { t: '飞星秘仪', d: '四化飞星深层用法与自化辨析' }
]

export default function LibraryPage() {
  return (
    <View className="page">
      <View style={{ padding: '24px 24px 0' }}>
        <SectionTitle>古籍库</SectionTitle>
      </View>
      <Text className="muted" style={{ fontSize: 20, padding: '8px 24px 0', display: 'block' }}>
        全文检索在 SaaS 端提供，小程序先列出典藏目录。
      </Text>
      {BOOKS.map((b) => (
        <View key={b.t} className="card col" style={{ gap: 6 }}>
          <Text style={{ fontSize: 28, fontWeight: 700, color: C.text }}>{b.t}</Text>
          <Text className="muted" style={{ fontSize: 22 }}>
            {b.d}
          </Text>
        </View>
      ))}
    </View>
  )
}
