import { createContext, useContext } from 'react'
import { parts, weekday } from '../domain/dates'
import type { Day, Locale } from '../domain/types'
import { en, type MessageKey } from './en'
import { ja } from './ja'

const messages: Record<Locale, Record<MessageKey, string>> = { en, ja }
const WD: Record<Locale, string[]> = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ja: ['日', '月', '火', '水', '木', '金', '土'],
}
const MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export type Vars = Record<string, string | number>

export function makeI18n(locale: Locale) {
  const dict = messages[locale]
  const t = (key: MessageKey, vars: Vars = {}) =>
    dict[key].replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''))
  const ordinal = (n: number) =>
    locale === 'ja' ? `${n}日` : n + (['th', 'st', 'nd', 'rd'][((n % 100) - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th')
  const wd = (d: Day) => WD[locale][weekday(d)]
  const month = (m: number) => (locale === 'ja' ? `${m}月` : MON_EN[m - 1])
  const dateLong = (d: Day) => {
    const [, m, dd] = parts(d)
    return locale === 'ja' ? `${m}月${dd}日(${wd(d)})` : `${wd(d)}, ${MON_EN[m - 1]} ${dd}`
  }
  const dateShort = (d: Day) => {
    const [, m, dd] = parts(d)
    return locale === 'ja' ? `${m}/${dd}(${wd(d)})` : `${wd(d)} ${MON_EN[m - 1]} ${dd}`
  }
  return { locale, t, ordinal, wd, month, dateLong, dateShort }
}

export type I18n = ReturnType<typeof makeI18n>
export const I18nContext = createContext<I18n>(makeI18n('en'))
export const useI18n = () => useContext(I18nContext)

export const yen = (n: number) => (n < 0 ? '-' : '') + '¥' + Math.round(Math.abs(n)).toLocaleString('ja-JP')
