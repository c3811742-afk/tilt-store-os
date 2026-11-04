import type { ErrorStateProps } from './ErrorState.types';

export const errorStateDefaults: Required<Pick<ErrorStateProps, 'showHomeLink'>> = {
  showHomeLink: false,
};
