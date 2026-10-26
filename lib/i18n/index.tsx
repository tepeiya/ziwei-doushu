'use client';
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type Locale = 'zh' | 'en';
export const LOCALES: Locale[] = ['zh', 'en'];

// 最小化文案字典：仅示范机制，完整多语言翻译属内容工作（逐步补充 key 即可）
const messages: Record<Locale, Record<string, string>> = {
  zh: {
    'nav.home': '首页',
    'nav.chart': '排盘',
    'nav.heming': '合盘',
    'nav.fortune': '流年',
    'nav.annual': '年运',
    'nav.knowledge': '知识库',
    'nav.library': '古籍库',
    'nav.profile': '我的',
  },
  en: {
    'nav.home': 'Home',
    'nav.chart': 'Chart',
    'nav.heming': 'Compatibility',
    'nav.fortune': 'Yearly',
    'nav.annual': 'Annual',
    'nav.knowledge': 'Knowledge',
    'nav.library': 'Classics',
    'nav.profile': 'Account',
  },
};

interface I18nCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const LocaleCtx = createContext<I18nCtx>({
  locale: 'zh',
  setLocale: () => {},
  t: (k) => k,
});

export function LocaleProvider({
  children,
  initial = 'zh',
}: {
  children: ReactNode;
  initial?: Locale;
}) {
  const [locale, setLocale] = useState<Locale>(initial);
  const t = useCallback((k: string) => messages[locale][k] ?? messages.zh[k] ?? k, [locale]);
  return <LocaleCtx.Provider value={{ locale, setLocale, t }}>{children}</LocaleCtx.Provider>;
}

export function useI18n(): I18nCtx {
  return useContext(LocaleCtx);
}

/** 客户端组件内取翻译函数：const t = useT(); t('nav.chart') */
export function useT(): (key: string) => string {
  return useContext(LocaleCtx).t;
}
