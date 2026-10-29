export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/chart/chart',
    'pages/heming/heming',
    'pages/fortune/fortune',
    'pages/annual/annual',
    'pages/knowledge/knowledge',
    'pages/library/library',
    'pages/member/member',
    'pages/pay/pay'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#0e0c08',
    navigationBarTitleText: '紫微斗数',
    navigationBarTextStyle: 'white',
    backgroundColor: '#0e0c08'
  },
  tabBar: {
    color: '#9a8f7a',
    selectedColor: '#d4af37',
    backgroundColor: '#0e0c08',
    borderStyle: 'black',
    list: [
      { pagePath: 'pages/index/index', text: '首页' },
      { pagePath: 'pages/chart/chart', text: '排盘' },
      { pagePath: 'pages/heming/heming', text: '合盘' },
      { pagePath: 'pages/member/member', text: '我的' }
    ]
  }
})
