'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

export type Theme = 'dark' | 'light';

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
  /** 首次水合完成前为 false，用于门控 SSR/客户端可能不一致的主题相关渲染 */
  mounted: boolean;
}>({ theme: 'dark', toggle: () => {}, mounted: false });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // 初始值固定为服务端默认（dark），客户端水合完成后才从 document 读取真实主题：
  // 若直接在 useState 初始化器读取 data-theme，light 用户的客户端首渲染与服务端 HTML
  // 不一致，会触发全站 hydration mismatch。视觉本身不受影响——layout 内联脚本
  // 已在水合前把 data-theme（CSS 变量）设置为正确主题。
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const attr = document.documentElement.getAttribute('data-theme');
    const saved = localStorage.getItem('ziwei-theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') setTheme(saved);
    else if (attr === 'light') setTheme('light');
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem('ziwei-theme', theme);
  }, [theme, mounted]);

  // 用 ref 持有定时器，快速连点时清除上一次未结束的 transition 标记，避免残留
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toggle = () => {
    const root = document.documentElement;
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    root.classList.add('theme-transitioning');
    setTheme(t => t === 'dark' ? 'light' : 'dark');
    transitionTimer.current = setTimeout(() => root.classList.remove('theme-transitioning'), 420);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
