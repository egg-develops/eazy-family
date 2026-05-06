import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 p-8 text-center">
          <p className="text-muted-foreground">Something went wrong loading this page.</p>
          {this.state.error && (
            <p className="text-xs text-destructive font-mono max-w-xs break-all opacity-70">
              {this.state.error.message}
            </p>
          )}
          <Button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}>
            Reload
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
