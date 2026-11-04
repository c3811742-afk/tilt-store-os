import { useLocale } from '@/shared/hooks';
import { StateMessage } from '../StateMessage';
import type { EmptyStateProps } from './EmptyState.types';

export const EmptyState = ({ title, message, action, minHeight }: EmptyStateProps) => {
  const { text } = useLocale();
  return (
    <StateMessage
      title={title ?? text.states.empty.title}
      message={message ?? text.states.empty.message}
      actions={action}
      minHeight={minHeight}
    />
  );
};
