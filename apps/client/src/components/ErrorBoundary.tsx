import { Component, type ErrorInfo, type ReactNode } from "react";
import { describeError, reportError } from "../lib/errorReporting.ts";
import "./ErrorBoundary.css";

type Props = {
  children: ReactNode;
  /** Reloads the app. Tests replace it, since jsdom can't reload. */
  reload?: () => void;
};

/** Shows "Something went wrong" instead of a blank page when rendering crashes, and reports the crash (spec 004, AC-12). */
export class ErrorBoundary extends Component<Props, { crashed: boolean }> {
  state = { crashed: false };

  static getDerivedStateFromError(): { crashed: boolean } {
    return { crashed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    const { message, stack } = describeError(error);
    // The component stack says where in the app the crash happened.
    const fullStack = [stack, info.componentStack].filter(Boolean).join("\n");
    reportError({ kind: "render", message, ...(fullStack ? { stack: fullStack } : {}) });
  }

  render(): ReactNode {
    if (!this.state.crashed) return this.props.children;
    const reload =
      this.props.reload ??
      (() => {
        window.location.reload();
      });
    return (
      <div className="crash" role="alert">
        <h1>Something went wrong</h1>
        <p>The app hit an unexpected error.</p>
        <button type="button" className="primary" onClick={reload}>
          Reload
        </button>
      </div>
    );
  }
}
