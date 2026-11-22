import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  resetKey?: unknown;
}

interface State {
  hasError: boolean;
  error: Error | null;
  prevResetKey?: unknown;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      prevResetKey: props.resetKey,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.prevResetKey) {
      return {
        hasError: false,
        error: null,
        prevResetKey: props.resetKey,
      };
    }
    return null;
  }

  componentDidCatch(error: Error) {
    console.error("Error caught by boundary:", error);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "24px 16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "calc(100vh - 61px)",
          }}
        >
          <div
            className="card"
            style={{
              textAlign: "center",
              maxWidth: 600,
              padding: "40px",
            }}
          >
            <h1 style={{ fontSize: 24, marginBottom: 16, color: "var(--text)" }}>
              Oops! Something went wrong
            </h1>
            <p style={{ color: "var(--muted)", marginBottom: 24 }}>
              We encountered an unexpected error while rendering this page.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <details
                style={{
                  textAlign: "left",
                  marginBottom: 24,
                  padding: "12px",
                  background: "var(--bg)",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "var(--muted)",
                }}
              >
                <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                  Error details
                </summary>
                <pre style={{ marginTop: 8, overflow: "auto", whiteSpace: "pre-wrap" }}>
                  {this.state.error.toString()}
                  {"\n\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <button onClick={this.handleReload}>Reload Page</button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
