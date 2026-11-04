import { Component, type ErrorInfo } from 'react';
import { useLocale } from '@/shared/hooks';
import { ErrorState } from '../ErrorState';
import type { ErrorBoundaryProps } from './ErrorBoundary.types';

interface ErrorBoundaryState {
  hasError: boolean;
  resetKey: unknown;
}

const CrashFallback = ({ onRetry }: { onRetry: () => void }) => {
  const { text } = useLocale();
  return <ErrorState title={text.states.crash.title} message={text.states.crash.message} onRetry={onRetry} showHomeLink />;
};

// Catches render errors below it and shows a friendly screen instead of a blank page.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  static getDerivedStateFromProps(props: ErrorBoundaryProps, state: ErrorBoundaryState) {
    return props.resetKey === state.resetKey ? null : { hasError: false, resetKey: props.resetKey };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    return this.props.fallback ? this.props.fallback(this.reset) : <CrashFallback onRetry={this.reset} />;
  }
}
