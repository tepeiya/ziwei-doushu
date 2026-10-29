// 引擎里部分受保护的函数（流派/闰月配置迁移）会在调用时读写 localStorage。
// 小程序运行环境没有浏览器 localStorage，这里用内存 Map 垫片，保证导入引擎不崩溃、
// 且相关函数降级为「走默认配置」。generateChart 本身不触碰 localStorage。
try {
  const g: any = typeof globalThis !== 'undefined' ? globalThis : (global as any)
  if (typeof g.localStorage === 'undefined') {
    const store = new Map<string, string>()
    g.localStorage = {
      getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
      setItem: (k: string, v: string) => {
        store.set(k, String(v))
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
      clear: () => store.clear(),
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() {
        return store.size
      }
    }
  }
} catch {
  /* 垫片安装失败不阻塞启动 */
}
