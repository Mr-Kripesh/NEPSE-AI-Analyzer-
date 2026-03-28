import { SECTOR_COLORS } from './constants';

export const vClass = (v: string) => {
  const lv = (v || '').toLowerCase();
  return lv.includes('buy') ? 'buy'
       : lv.includes('sell') ? 'sell'
       : lv.includes('hold') ? 'hold'
       : 'neutral';
};

export const fmt = (n: number) =>
  'Rs.' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const sectorColor = (s: string) => SECTOR_COLORS[s] || '#7f8c8d';
export const sectorSlug  = (s: string) => 'sc-' + s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
