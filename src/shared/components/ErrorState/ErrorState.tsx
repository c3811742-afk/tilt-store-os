import { useNavigate } from 'react-router';
import { routes } from '@/shared/constants';
import { useLocale } from '@/shared/hooks';
import { withDefaults } from '@/shared/utils';
import { Button } from '../Button';
import { StateMessage } from '../StateMessage';
import { errorStateDefaults } from './ErrorState.defaults';
import type { ErrorStateProps } from './ErrorState.types';

export const ErrorState = (props: ErrorStateProps) => {
  const { title, message, onRetry, showHomeLink, minHeight } = withDefaults(errorStateDefaults, props);
  const { text } = useLocale();
  const navigate = useNavigate();

  const actions = (onRetry || showHomeLink) && (
    <>
      {onRetry && <Button onClick={onRetry}>{text.common.tryAgain}</Button>}
      {showHomeLink && (
        <Button variant="secondary" onClick={() => navigate(routes.home)}>
          {text.common.backToHome}
        </Button>
      )}
    </>
  );

  return (
    <StateMessage
      role="alert"
      title={title ?? text.states.error.title}
      message={message ?? text.states.error.message}
      actions={actions}
      minHeight={minHeight}
    />
  );
};
