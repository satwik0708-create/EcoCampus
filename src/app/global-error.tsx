"use client";

/**
 * Last-resort boundary for errors thrown in the root layout itself.
 * It must render its own <html>/<body> because the root layout has failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#fbfdfb",
          color: "#17251e",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
            EcoCampus could not start
          </h1>
          <p style={{ lineHeight: 1.6, color: "#4a5c53" }}>
            An unexpected error stopped the application from rendering. Try
            reloading; if it persists, contact your campus administrator.
          </p>
          {error.digest ? (
            <p style={{ fontSize: "0.75rem", color: "#7a8a82" }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            onClick={reset}
            style={{
              marginTop: "1.25rem",
              padding: "0.6rem 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#2f7a55",
              color: "white",
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
