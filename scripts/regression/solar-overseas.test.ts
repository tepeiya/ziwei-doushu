import assert from 'node:assert/strict';
import { calcTrueSolarBranch, formToBirthInfo } from '../../lib/ziwei/share';

// 真太阳时按经度计算：东京(139.7°E) 与 北京(120°E) 同一钟表时间应得到不同时辰
const tokyo = calcTrueSolarBranch(12, 0, 139.7);
const beijing = calcTrueSolarBranch(12, 0, 120);
assert.notEqual(tokyo, beijing, '海外经度应影响真太阳时辰');
assert.equal(calcTrueSolarBranch(12, 0, 139.7), tokyo, '计算应确定性');

// 海外模式（province='overseas'）应把经度透传到 BirthInfo，供引擎校正时辰
const form: any = {
  name: '',
  year: '1990',
  month: '1',
  day: '1',
  clockHour: '12',
  clockMinute: '0',
  unknownTime: false,
  province: 'overseas',
  city: '',
  longitude: 139.7,
  gender: 'male',
};
const info = formToBirthInfo(form);
assert.equal(info.longitude, 139.7, '海外模式应透传经度');

console.log('overseas solar tests passed');
