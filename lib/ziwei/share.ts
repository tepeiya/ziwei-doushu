import type { BirthFormState } from '@/components/BirthForm';
import type { BirthInfo } from './types';

/** 根据北京时间 + 经度计算真太阳时时辰支 (0-11) */
export function calcTrueSolarBranch(clockHour: number, clockMinute: number, longitude: number): number {
  const clockMins = clockHour * 60 + clockMinute;
  const offset = (longitude - 120) * 4;
  const solar = ((clockMins + offset) % 1440 + 1440) % 1440;
  if (solar >= 1380 || solar < 60) return 0;
  return Math.floor((solar - 60) / 120) + 1;
}

/** BirthFormState → BirthInfo
 *
 * 子时规则（倪海厦体系/三合派标准）：
 * · 23:00-23:59 = 晚子时，**按次日**排盘（日期 +1）
 * · 00:00-00:59 = 早子时，按本日排盘
 * 这与「时辰支同为子(0)」并不冲突——子时分早晚两段，需要在日期上区分。
 */
export function formToBirthInfo(form: BirthFormState): BirthInfo {
  let y = parseInt(form.year) || 0;
  let m = parseInt(form.month) || 0;
  let d = parseInt(form.day) || 0;

  // 晚子时（23:00-23:59）按次日处理：用 Date 对象自动处理月末/年末进位
  if (!form.unknownTime) {
    const clockHour = parseInt(form.clockHour) || 0;
    if (clockHour === 23 && y > 0 && m > 0 && d > 0) {
      const next = new Date(y, m - 1, d + 1);
      y = next.getFullYear();
      m = next.getMonth() + 1;
      d = next.getDate();
    }
  }

  const hour = form.unknownTime
    ? 0
    : calcTrueSolarBranch(parseInt(form.clockHour) || 0, parseInt(form.clockMinute) || 0, form.longitude);
  return {
    year: y, month: m, day: d,
    hour,
    gender: form.gender,
    name: form.name || undefined,
    province: form.province || undefined,
    city: form.city || undefined,
    longitude: form.province ? form.longitude : undefined,
  };
}

/** BirthFormState → URLSearchParams（用于分享链接） */
export function formToSearchParams(form: BirthFormState): URLSearchParams {
  const p = new URLSearchParams();
  if (form.name) p.set('n', form.name);
  p.set('y', form.year);
  p.set('m', form.month);
  p.set('d', form.day);
  if (form.unknownTime) {
    p.set('u', '1');
  } else {
    p.set('h', form.clockHour);
    p.set('mi', form.clockMinute);
  }
  if (form.province) p.set('p', form.province);
  if (form.city) p.set('c', form.city);
  if (form.longitude && form.longitude !== 120) p.set('lo', String(form.longitude));
  p.set('g', form.gender === 'male' ? 'm' : 'f');
  return p;
}

/** URLSearchParams → Partial<BirthFormState>，不完整时返回 null */
export function searchParamsToForm(params: URLSearchParams): Partial<BirthFormState> | null {
  const year = params.get('y');
  const month = params.get('m');
  const day = params.get('d');
  if (!year || !month || !day) return null;
  return {
    name: params.get('n') || '',
    year,
    month,
    day,
    unknownTime: params.get('u') === '1',
    clockHour: params.get('h') || '8',
    clockMinute: params.get('mi') || '0',
    province: params.get('p') || '',
    city: params.get('c') || '',
    longitude: parseFloat(params.get('lo') || '120'),
    gender: params.get('g') === 'f' ? 'female' : 'male',
  };
}

/**
 * 档案 BirthInfo → Partial<BirthFormState>（预填回显用）
 *
 * BirthInfo.hour 是时辰支索引（0=子…11=亥），无法还原精确钟表时间，
 * 这里取每个时辰段的起始小时作近似：丑(1)→1 点、巳(5)→9 点；
 * 0 取 0 点（00:00 同属子支，且不会触发晚子时换日造成日期偏移）。
 * 得到的表单按真太阳时重算会回到同一时辰支，排盘结果一致。
 * 主要用于「自动带入最近一次档案」的预填，时辰精度标注为估算。
 */
export function birthInfoToForm(b: {
  year?: number; month?: number; day?: number; hour?: number;
  gender?: string; name?: string; province?: string; city?: string; longitude?: number;
}): Partial<BirthFormState> {
  const hour = typeof b.hour === 'number' ? b.hour : 0;
  const clockHour = hour === 0 ? '0' : String(hour * 2 - 1);
  return {
    name: b.name ?? '',
    year: b.year ? String(b.year) : '',
    month: b.month ? String(b.month) : '',
    day: b.day ? String(b.day) : '',
    clockHour,
    clockMinute: '0',
    unknownTime: false,
    province: b.province ?? '',
    city: b.city ?? '',
    longitude: b.longitude ?? 120,
    gender: b.gender === 'female' ? 'female' : 'male',
  };
}
