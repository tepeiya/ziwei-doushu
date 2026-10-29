import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import './polyfills'
import './app.css'

function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    // 小程序启动
  })
  return children
}

export default App
