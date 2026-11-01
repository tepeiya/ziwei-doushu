/**
 * 名人命盘数据库
 * 基于公开记录的出生日期，时辰为估算值（部分有文献记载）
 *
 * 注意：纯静态数据模块，不依赖任何服务端 API；
 * FamousPersonCard（客户端组件）会引用其类型与字段直接渲染，
 * 并据出生信息构造 /chart 分享深链，因此此模块须可在客户端侧使用。
 */

export interface FamousPerson {
  id: string;
  name: string;
  nameEn: string;
  category: '商业' | '文艺' | '历史' | '体育' | '科技';
  description: string;           // 一句话身份介绍
  descriptionEn: string;
  year: number;
  month: number;
  day: number;
  hour: number;                  // 时辰地支索引 0-11
  gender: 'male' | 'female';
  notable: string;               // 命盘亮点提示（启发用户兴趣）
  notableEn: string;
}

export const FAMOUS_PERSONS: FamousPerson[] = [
  // ─── 商业传奇 ─────────────────────────────────────────────
  {
    id: 'ma-yun',
    name: '马云',
    nameEn: 'Jack Ma',
    category: '商业',
    description: '阿里巴巴创始人',
    descriptionEn: 'Founder of Alibaba',
    year: 1964, month: 9, day: 10, hour: 5,  // 约巳时
    gender: 'male',
    notable: '命盘显示极强的破格重建之力，官禄宫星曜与互联网商业帝国高度对应',
    notableEn: 'The chart shows an exceptional ability to break established patterns and rebuild, while the Career Palace closely parallels the rise of an internet business empire.',
  },
  {
    id: 'li-jiacheng',
    name: '李嘉诚',
    nameEn: 'Li Ka-shing',
    category: '商业',
    description: '香港超级富豪，长和系创始人',
    descriptionEn: 'Hong Kong billionaire and founder of the CK Hutchison business empire',
    year: 1928, month: 7, day: 29, hour: 3,  // 约卯时
    gender: 'male',
    notable: '财帛宫四化是研究东方首富命盘的绝佳案例，禄存守财，越积越厚',
    notableEn: 'The Four Transformations in the Wealth Palace make this a compelling case study of extraordinary wealth; Lu Cun preserves assets and supports steady accumulation.',
  },
  {
    id: 'ren-zhengfei',
    name: '任正非',
    nameEn: 'Ren Zhengfei',
    category: '商业',
    description: '华为创始人',
    descriptionEn: 'Founder of Huawei',
    year: 1944, month: 10, day: 25, hour: 3, // 卯时
    gender: 'male',
    notable: '七杀入命格局，一生逆风而行，越打压越强大，倪师七杀理论的活教材',
    notableEn: 'Qi Sha in the Life Palace points to a life strengthened by adversity—the greater the pressure, the stronger the response—making this a vivid case study of traditional Qi Sha theory.',
  },

  // ─── 文艺名人 ─────────────────────────────────────────────
  {
    id: 'zhang-ailing',
    name: '张爱玲',
    nameEn: 'Eileen Chang',
    category: '文艺',
    description: '中国现代文学巨匠',
    descriptionEn: 'A master of modern Chinese literature',
    year: 1920, month: 9, day: 30, hour: 1, // 丑时
    gender: 'female',
    notable: '命盘孤独星曜组合与其传奇感情经历、文学成就形成神奇对照',
    notableEn: 'The chart’s combination of solitary stars forms a striking parallel with her celebrated romantic history and literary achievements.',
  },
  {
    id: 'jay-chou',
    name: '周杰伦',
    nameEn: 'Jay Chou',
    category: '文艺',
    description: '华语流行音乐天王',
    descriptionEn: 'Mandopop singer-songwriter and cultural icon',
    year: 1979, month: 1, day: 18, hour: 1,  // 丑时（据报道夜间出生）
    gender: 'male',
    notable: '文曲星与贪狼的组合，天生才艺之命，命盘解释了他为何能横跨音乐各风格',
    notableEn: 'The combination of Wen Qu and Tan Lang suggests natural artistic talent and helps explain his ability to move across musical styles.',
  },
  {
    id: 'wang-fei',
    name: '王菲',
    nameEn: 'Faye Wong',
    category: '文艺',
    description: '华语乐坛最具传奇色彩的女歌手',
    descriptionEn: 'One of the most iconic singers in Chinese pop',
    year: 1969, month: 8, day: 8, hour: 4,   // 辰时
    gender: 'female',
    notable: '夫妻宫星曜与其两段传奇婚姻高度对应，感情格局极具研究价值',
    notableEn: 'The stars in the Marriage Palace closely parallel her two high-profile marriages, making the relationship pattern especially valuable for study.',
  },
  {
    id: 'lin-zhiling',
    name: '林志玲',
    nameEn: 'Lin Chi-ling',
    category: '文艺',
    description: '台湾名模、演员',
    descriptionEn: 'Taiwanese model and actress',
    year: 1974, month: 11, day: 29, hour: 5, // 巳时
    gender: 'female',
    notable: '太阴守命的女性美貌典范，命盘完美印证倪师"太阴入命女孩最漂亮"的论断',
    notableEn: 'Tai Yin guarding the Life Palace is a classic symbol of feminine grace, closely echoing the traditional view that this placement bestows exceptional beauty.',
  },

  // ─── 科技精英 ─────────────────────────────────────────────
  {
    id: 'steve-jobs',
    name: '乔布斯',
    nameEn: 'Steve Jobs',
    category: '科技',
    description: '苹果公司联合创始人',
    descriptionEn: 'Co-founder of Apple',
    year: 1955, month: 2, day: 24, hour: 6,  // 午时
    gender: 'male',
    notable: '破军入命格局，被亲生父母遗弃又创建苹果帝国，破而后立的命盘典范',
    notableEn: 'Po Jun in the Life Palace, adoption at birth, and the creation of the Apple empire make this an archetypal chart of renewal after disruption.',
  },
  {
    id: 'elon-musk',
    name: '马斯克',
    nameEn: 'Elon Musk',
    category: '科技',
    description: '特斯拉、SpaceX创始人',
    descriptionEn: 'Founder of SpaceX and CEO of Tesla',
    year: 1971, month: 6, day: 28, hour: 4,  // 辰时（7:30AM 有文献记录）
    gender: 'male',
    notable: '杀破狼格局的极致体现，命盘中驿马星旺盛，一生在改变人类未来边界',
    notableEn: 'An intense expression of the Sha Po Lang pattern, with a powerful Travel Horse star and a life devoted to pushing the boundaries of humanity’s future.',
  },

  // ─── 体育明星 ─────────────────────────────────────────────
  {
    id: 'yao-ming',
    name: '姚明',
    nameEn: 'Yao Ming',
    category: '体育',
    description: 'NBA传奇中锋，中国篮球代言人',
    descriptionEn: 'Legendary NBA center and ambassador for Chinese basketball',
    year: 1980, month: 9, day: 12, hour: 5,  // 巳时
    gender: 'male',
    notable: '天梁守命，高大威严，官禄宫星象与其职业成就高度吻合',
    notableEn: 'Tian Liang guarding the Life Palace suggests stature and dignity, while the Career Palace closely aligns with his professional achievements.',
  },
  {
    id: 'li-na',
    name: '李娜',
    nameEn: 'Li Na',
    category: '体育',
    description: '中国网球大满贯得主',
    descriptionEn: 'Chinese Grand Slam tennis champion',
    year: 1982, month: 2, day: 26, hour: 2,  // 寅时
    gender: 'female',
    notable: '七杀化气，命中注定与人竞争，大限流年与法网夺冠时间点精准对应',
    notableEn: 'Qi Sha channels a powerful competitive drive, while the major periods and annual cycles closely align with the timing of her French Open victory.',
  },
];

/** 按分类获取名人 */
export function getFamousByCategory(category: FamousPerson['category']): FamousPerson[] {
  return FAMOUS_PERSONS.filter(p => p.category === category);
}

/** 获取所有分类 */
export const FAMOUS_CATEGORIES: FamousPerson['category'][] = [
  '商业', '文艺', '科技', '体育',
];
