import { View, Text } from '@tarojs/components'
import { useRouter } from '@tarojs/taro'
import { C } from '@/theme'
import SectionTitle from '@/components/SectionTitle'

export default function PayPage() {
  const router = useRouter()
  const orderId = router.params.orderId as string | undefined

  return (
    <View className="page">
      <View style={{ padding: '24px 24px 0' }}>
        <SectionTitle>支付</SectionTitle>
      </View>

      <View className="card col" style={{ gap: 12 }}>
        <Text className="muted" style={{ fontSize: 24 }}>
          订单号
        </Text>
        <Text style={{ fontSize: 26, color: C.text }}>{orderId ?? '—'}</Text>
        <Text className="muted" style={{ fontSize: 22, marginTop: 8 }}>
          支付网关在 SaaS 端对接微信/支付宝后启用。当前为待接入状态。
        </Text>
      </View>
    </View>
  )
}
