import type { JournalScore } from '../src/types';
export function badgeValue(score: JournalScore): string | null;
export function barDisplay(score: JournalScore): { lower: number; upper: number; tone: 'red' | 'pink' | 'perfect' };
