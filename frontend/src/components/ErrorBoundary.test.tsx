import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import React, { useState } from "react";
import ErrorBoundary from "./ErrorBoundary";

// A component that intentionally throws an error when shouldThrow is true
function Bomb({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error("Test render error");
  }
  return <div>Bomb defused</div>;
}

function ProblemRoute() {
  return (
    <div>
      <h2>Problem Page</h2>
      <Bomb shouldThrow={true} />
    </div>
  );
}

function GoodRoute() {
  return <div>Good Page Content</div>;
}

function NavigationTestApp({ initialEntries = ["/good"] }: { initialEntries?: string[] }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <AppContent />
    </MemoryRouter>
  );
}

function AppContent() {
  const location = useLocation();
  return (
    <div>
      <nav>
        <Link to="/good">Go to Good</Link>
        <Link to="/bad">Go to Bad</Link>
      </nav>
      <ErrorBoundary resetKey={location.pathname}>
        <Routes>
          <Route path="/good" element={<GoodRoute />} />
          <Route path="/bad" element={<ProblemRoute />} />
        </Routes>
      </ErrorBoundary>
    </div>
  );
}

describe("ErrorBoundary", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress console.error in tests for expected thrown errors
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary resetKey="/home">
        <div>Safe Child Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText("Safe Child Content")).toBeDefined();
  });

  it("catches render errors and displays fallback UI", () => {
    render(
      <ErrorBoundary resetKey="/bad">
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByText("Oops! Something went wrong")).toBeDefined();
    expect(
      screen.getByText("We encountered an unexpected error while rendering this page.")
    ).toBeDefined();
  });

  it("persists error UI when re-rendered with the same resetKey", () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="/bad">
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByText("Oops! Something went wrong")).toBeDefined();

    // Re-render with same resetKey
    rerender(
      <ErrorBoundary resetKey="/bad">
        <div>Attempted recovery without key change</div>
      </ErrorBoundary>
    );

    expect(screen.getByText("Oops! Something went wrong")).toBeDefined();
  });

  it("resets error state when resetKey changes", () => {
    function StatefulHarness() {
      const [key, setKey] = useState("key1");
      const [throwErr, setThrowErr] = useState(true);

      return (
        <div>
          <button
            onClick={() => {
              setKey("key2");
              setThrowErr(false);
            }}
          >
            Switch Route
          </button>
          <ErrorBoundary resetKey={key}>
            {throwErr ? <Bomb /> : <div>Recovered Child Content</div>}
          </ErrorBoundary>
        </div>
      );
    }

    render(<StatefulHarness />);

    expect(screen.getByText("Oops! Something went wrong")).toBeDefined();

    fireEvent.click(screen.getByText("Switch Route"));

    expect(screen.queryByText("Oops! Something went wrong")).toBeNull();
    expect(screen.getByText("Recovered Child Content")).toBeDefined();
  });

  it("clears error boundary when navigating from an errored route to another route", () => {
    render(<NavigationTestApp initialEntries={["/bad"]} />);

    // Initially on /bad which throws
    expect(screen.getByText("Oops! Something went wrong")).toBeDefined();
    expect(screen.queryByText("Good Page Content")).toBeNull();

    // Click link to navigate to /good
    fireEvent.click(screen.getByText("Go to Good"));

    // Error UI should be cleared and good page content visible
    expect(screen.queryByText("Oops! Something went wrong")).toBeNull();
    expect(screen.getByText("Good Page Content")).toBeDefined();

    // Navigate back to /bad
    fireEvent.click(screen.getByText("Go to Bad"));

    // Error UI displays again for the bad route
    expect(screen.getByText("Oops! Something went wrong")).toBeDefined();
  });
});
