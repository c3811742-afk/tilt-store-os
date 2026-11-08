import { ErrorState } from '@/shared/components';
import { useLocale } from '@/shared/hooks';

// Shown instead of a page the person's role doesn't allow.
export const AccessPage = () => {
  const { text } = useLocale();
  return <ErrorState title={text.access.title} message={text.access.message} showHomeLink />;
};
