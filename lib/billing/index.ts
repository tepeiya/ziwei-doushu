/**
 * 套餐与计费定义
 * 价格单位：分（人民币）。生产接入微信/支付宝时，金额直接复用 priceFen。
 */
export interface Plan {
  id: 'single' | 'monthly' | 'yearly';
  name: string;
  priceFen: number;
  period?: string;
  desc: string;
  features: string[];
  tag?: string;
  popular?: boolean;
}

export const PLANS: Record<Plan['id'], Plan> = {
  single: {
    id: 'single',
    name: '单次精批',
    priceFen: 1990,
    desc: '一次完整 AI 命盘解读',
    features: ['13 维完整解读', '命盘永久保存', '可导出分享图'],
  },
  monthly: {
    id: 'monthly',
    name: '月卡会员',
    priceFen: 2990,
    period: '30 天',
    desc: '一个月内无限次解读',
    features: ['无限次 AI 解读', '合盘 / 流年运势', '命书 / 年度运势 PDF 导出', '优先算力'],
    tag: '热门',
    popular: true,
  },
  yearly: {
    id: 'yearly',
    name: '年卡会员',
    priceFen: 19900,
    period: '365 天',
    desc: '全年无限次解读，最划算',
    features: ['包含月卡全部权益', '单价低至 ¥1.6/天', '生日专属运势报告'],
    tag: '超值',
  },
};

export function getPlan(id: string): Plan | undefined {
  return (PLANS as Record<string, Plan>)[id];
}

export function formatYuan(fen: number): string {
  return `¥${(fen / 100).toFixed(fen % 100 === 0 ? 0 : 2)}`;
}
