// Numbers and dates as the panels show them: concise, UK English, units always named.
import type {CalendarDate} from '../sim/clock';
import type {Stock} from '../sim/graph';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const two = (n: number) => String(n).padStart(2, '0');

/** "Mon 15 Mar" */
export const dayName = (d: CalendarDate) => `${DAYS[d.weekday]} ${d.day} ${MONTHS[d.month - 1]}`;
/** "06:00" */
export const clockTime = (d: CalendarDate) => `${two(d.hour)}:00`;

export const money = (gbp: number) => (gbp < 0 ? '−' : '') + '£' + Math.abs(gbp).toFixed(2);

/** A number to a sensible precision: 0.25, 3.4, 12, 1,250. */
export function num(x: number): string {
  const a = Math.abs(x), dp = a === 0 || a >= 10 ? 0 : a >= 1 ? 1 : 2;
  return x.toLocaleString('en-GB', {maximumFractionDigits: dp, minimumFractionDigits: 0});
}

const UNIT: Record<Stock['unit'], string> = {
  L: 'L', kgN: 'kg N', kgP: 'kg P', kgK: 'kg K', kgCO2e: 'kg CO₂e', kgFood: 'kg', kgFeed: 'kg', kgWaste: 'kg', h: 'h', kWh: 'kWh', GBP: '£',
  m2: 'm²', pests: '', support: 'points',
};
export function amount(s: Stock): string {
  if (s.unit === 'GBP') return money(s.amount);
  const u = UNIT[s.unit];
  return `${num(s.amount)}${s.cap !== undefined ? ' of ' + num(s.cap) : ''}${u ? ' ' + u : ''}`;
}

/** A small mass in kg as grams below a kilogram: "12 g", "1.2 kg". */
export const grams = (kg: number) => (Math.abs(kg) < 1 ? `${num(kg * 1000)} g` : `${num(kg)} kg`);
