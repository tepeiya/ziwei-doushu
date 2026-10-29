import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { C } from '@/theme'
import { createOrder, isApiConfigured } from '@/lib/api'
import SectionTitle from '@/components/SectionTitle'

const PLANS = [
  { id: 'month', name: '月卡', price: '¥39', desc: '全功能畅享 30 天' },
  { id: 'year', name: '年卡', price: '¥365', desc: '全功能畅享 365 天' },
  { id: 'once', name: '单次', price: '¥19', desc: '单次年度运势命书' }
]

export default function MemberPage() {
  const [loading, setLoading] = useState(false)

  const open = async (plan: string) => {
    if (!isApiConfigured()) {
      Taro.showToast({ title: '请先在 api.ts 配置 API_BASE', icon: 'none' })
      return
    }
    setLoading(true)
    const res = await createOrder({ plan })
    setLoading(false)
    if (res.ok && res.data.orderId) {
      Taro.navigateTo({ url: `/pages/pay/pay?orderId=${res.data.orderId}` })
    } else {
      Taro.showToast({ title: '下单失败', icon: 'none' })
    }
  }

  return (
    <View className="page">
      <View style={{ padding: '24px 24px 0' }}>
        <SectionTitle>会员与权益</SectionTitle>
      </View>

      {!isApiConfigured() && (
        <View className="card">
          <Text className="muted" style={{ fontSize: 22 }}>
            支付功能需在 SaaS 接入后启用（配置 API_BASE 与微信/支付宝商户号）。
          </Text>
        </View>
      )}

      {PLANS.map((p) => (
        <View key={p.id} className="card row between">
          <View className="col" style={{ gap: 4 }}>
            <Text style={{ fontSize: 30, fontWeight: 700, color: C.text }}>{p.name}</Text>
            <Text className="muted" style={{ fontSize: 22 }}>
              {p.desc}
            </Text>
          </View>
          <View className="col" style={{ alignItems: 'flex-end', gap: 8 }}>
            <Text style={{ fontSize: 32, fontWeight: 800, color: C.gold }}>{p.price}</Text>
            <View className="btn-gold" style={{ padding: '10px 26px' }} onClick={() => open(p.id)}>
              <Text style={{ fontSize: 24, color: '#1a1408', fontWeight: 600 }}>{loading ? '处理中' : '开通'}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  )
}
