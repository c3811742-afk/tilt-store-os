import { isApiError } from '@/shared/api';
import { useLocale } from './useLocale';

// The friendly message for a failed call: a specific one for known reasons, the general one otherwise.
export const useErrorMessage = () => {
  const { text } = useLocale();
  return (error: unknown) => (error ? (isApiError(error) ? text.errors[error.code] : text.errors.network) : '');
};
