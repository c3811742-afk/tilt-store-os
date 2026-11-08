import { fillText } from '@/shared/utils';
import { useFormat } from './useFormat';
import { useLocale } from './useLocale';

// The message for a number of pieces: a whole number from 1 up to what there is, or why not.
export const useQtyError = () => {
  const { text } = useLocale();
  const format = useFormat();
  return (count: number, most: number) => (count < 1 ? text.validation.positive : count > most ? fillText(text.validation.atMost, { count: format.number(most) }) : undefined);
};
