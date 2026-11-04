import { useLocale } from '@/shared/hooks';
import { Spinner } from '../Spinner';
import { StateMessage } from '../StateMessage';
import type { LoadingStateProps } from './LoadingState.types';

export const LoadingState = ({ label, minHeight }: LoadingStateProps) => {
  const { text } = useLocale();
  return <StateMessage icon={<Spinner />} message={label ?? text.common.loading} minHeight={minHeight} />;
};
