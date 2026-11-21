/**
 * Error Boundary Component
 *
 * Catches an unhandled React error and shows a friendly fallback page,
 * instead of the whole app going to a white screen.
 *
 * Ported from Quill Medical's, without its error reporting and its
 * "Tell us what happened" feedback form: Juttu has neither yet. The error is
 * logged to the console, which is what a developer with the tools open
 * reads.
 */

import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

import ErrorState from "@/components/error-state/ErrorState";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorFallback onReload={this.handleReload} />;
    }

    return this.props.children;
  }
}

type FallbackProps = {
  onReload: () => void;
};

/**
 * What a failed page shows, exported for Storybook: `ErrorState` in its
 * page variant, offering a reload. A crash is the one case where replacing
 * the whole view is right, since there is nothing left to sit inside.
 */
export function ErrorFallback({ onReload }: FallbackProps) {
  return (
    <div data-testid="error-boundary-fallback">
      <ErrorState
        variant="page"
        message="An unexpected error occurred. Please try reloading the page."
        action={{ label: "Reload page", onClick: onReload }}
      />
    </div>
  );
}
