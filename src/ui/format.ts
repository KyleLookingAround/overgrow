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
/** An hour of the day, to the minute: 8.5 is "08:30". */
export const hourMinute = (h: number) => {
  const m = Math.round((((h % 24) + 24) % 24) * 60);
  return `${two(Math.floor(m / 60) % 24)}:${two(m % 60)}`;
};

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

/** Days, to a sensible precision: "1 day", "2.5 days". */
export const days = (d: number) => `${num(d)} ${num(d) === '1' ? 'day' : 'days'}`;

/** A small mass in kg as grams below a kilogram: "12 g", "1.2 kg". The unit is chosen after rounding (never "1,000 g"),
 *  and nothing reads "−0". */
export function grams(kg: number): string {
  const g = Math.round(Math.abs(kg) * 1000) === 0 ? 0 : kg * 1000;
  if (Math.abs(g) >= 999.5) return `${num(kg)} kg`;
  return `${num(Math.abs(g) >= 10 ? Math.round(g) : g) || 0} g`;
}

/** An effect's amount in its unit, as a place's list and the Explain card show it: "12 L", "3 % of the crop". */
export function effectAmount(amount: number, unit: string): string {
  switch (unit) {
    case 'share':
      return `${num(100 * amount)} % of the crop`;
    case 'GBP':
      return money(amount);
    case 'kgFood':
    case 'kgWaste':
      return grams(amount);
    case 'kgN':
    case 'kgP':
    case 'kgK':
      return `${grams(amount)} ${unit.slice(2)}`;
    case 'kgCO2e':
      return `${num(amount)} kg CO₂e`;
    case 'pests':
      return num(amount);
    case 'h':
      return `${num(amount)} h`;
    case 'm2':
      return `${num(amount)} m²`;
    case 'dd':
      return `${num(amount)} degree days`;
    default:
      return `${num(amount)} ${unit}`;
  }
}
