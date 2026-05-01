import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 p-8 text-center">
          <p className="text-muted-foreground">Something went wrong loading this page.</p>
          <Button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}>
            Reload
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
