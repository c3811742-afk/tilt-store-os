export interface ErrorStateProps {
  title?: string; // defaults to the generic error text of the active language
  message?: string;
  onRetry?: () => void; // shows a "Try again" button when given
  showHomeLink?: boolean; // shows a "Back to home" button
  minHeight?: string;
}
