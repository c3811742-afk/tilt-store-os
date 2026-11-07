import { roundMoney } from '@/shared/utils';
// The total of a drawer count: note or coin value -> how many.
export const countTotal = (count: Record<string, number>) => roundMoney(Object.entries(count).reduce((sum, [value, pieces]) => sum + Number(value) * pieces, 0));
