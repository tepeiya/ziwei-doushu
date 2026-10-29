import Taro from '@tarojs/taro'

// tabBar 页面必须用 switchTab，其余用 navigateTo
const TAB_PAGES = ['/pages/index/index', '/pages/chart/chart', '/pages/heming/heming', '/pages/member/member']

export function openPage(url: string) {
  if (TAB_PAGES.includes(url)) {
    Taro.switchTab({ url })
  } else {
    Taro.navigateTo({ url })
  }
}
