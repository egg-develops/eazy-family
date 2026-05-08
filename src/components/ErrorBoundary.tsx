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
    // Auto-reload on chunk load failures (stale deployment assets)
    if (error.message?.includes('Failed to fetch dynamically imported module') ||
        error.message?.includes('Importing a module script failed') ||
        error.name === 'ChunkLoadError') {
      window.location.href = window.location.pathname;
    }
  }

  render() {
    if (this.state.hasError) {
      const isChunkError = this.state.error?.message?.includes('Failed to fetch dynamically imported module');
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 p-8 text-center"
          style={{ background: '#FDF9F3' }}>
          <p style={{ color: '#55433F' }}>
            {isChunkError ? 'Loading new version…' : 'Something went wrong loading this page.'}
          </p>
          {!isChunkError && this.state.error && (
            <p className="text-xs font-mono max-w-xs break-all" style={{ color: '#BA1A1A', opacity: 0.7 }}>
              {this.state.error.message}
            </p>
          )}
          <Button
            onClick={() => { window.location.href = window.location.pathname; }}
            style={{ background: '#964735', color: '#fff', borderRadius: '9999px' }}
          >
            Reload
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
