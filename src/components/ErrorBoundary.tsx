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
    // If onboarding throws, clear the saved screen state so Reload/Start Over
    // doesn't drop the user back into the same erroring screen.
    if (window.location.pathname.includes('onboarding')) {
      localStorage.removeItem('eazy-onboarding-v2');
    }
    const isChunkError = error.message?.includes('Failed to fetch dynamically imported module') ||
      error.message?.includes('Importing a module script failed') ||
      error.name === 'ChunkLoadError';

    if (isChunkError) {
      // Guard against infinite reload loop: allow at most 2 auto-reloads per session
      const key = 'eb-reload-count';
      const count = Number(sessionStorage.getItem(key) ?? '0');
      if (count < 2) {
        sessionStorage.setItem(key, String(count + 1));
        window.location.href = window.location.pathname;
      }
      // Else fall through and show the error UI with manual options
    }
  }

  render() {
    if (this.state.hasError) {
      const isOnboarding = window.location.pathname.includes('onboarding');
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 p-8 text-center"
          style={{ background: '#FDF9F3' }}>
          <p style={{ color: '#55433F' }}>Something went wrong loading this page.</p>
          {this.state.error && (
            <p className="text-xs font-mono max-w-xs break-all" style={{ color: '#BA1A1A', opacity: 0.7 }}>
              {this.state.error.message}
            </p>
          )}
          <div className="flex gap-3">
            {isOnboarding && (
              <Button
                onClick={() => {
                  // Clear saved onboarding state so the loop can't re-enter the erroring screen
                  localStorage.removeItem('eazy-onboarding-v2');
                  sessionStorage.removeItem('eb-reload-count');
                  window.location.href = '/onboarding?fresh=1';
                }}
                style={{ background: '#964735', color: '#fff', borderRadius: '9999px' }}
              >
                Start Over
              </Button>
            )}
            <Button
              onClick={() => { sessionStorage.removeItem('eb-reload-count'); window.location.href = window.location.pathname; }}
              style={{ background: '#7A6260', color: '#fff', borderRadius: '9999px' }}
            >
              Reload
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
