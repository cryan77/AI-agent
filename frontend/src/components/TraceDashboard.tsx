import type { ChatResponse, RunMetrics } from "../types";

interface Props {
  trace: ChatResponse | null;
  metrics: RunMetrics;
}

const statusClass: Record<string, string> = {
  success: "status-success",
  error: "status-error",
  retry: "status-retry",
};

export default function TraceDashboard({ trace, metrics }: Props) {
  return (
    <section className="panel trace-panel">
      <div className="panel-header">
        <h2>Agent Trace</h2>
        <span className="panel-tag">Admin Dashboard</span>
      </div>

      <div className="metrics-bar">
        <div className="metric">
          <span className="metric-label">Latency</span>
          <span className="metric-value">{metrics.total_latency_ms.toFixed(0)} ms</span>
        </div>
        <div className="metric">
          <span className="metric-label">Tokens</span>
          <span className="metric-value">{metrics.token_usage.toLocaleString()}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Retries</span>
          <span className="metric-value">{metrics.retry_count}</span>
        </div>
        {trace?.decision && (
          <div className="metric">
            <span className="metric-label">Decision</span>
            <span className={`metric-value decision-${trace.decision}`}>{trace.decision}</span>
          </div>
        )}
      </div>

      {!trace ? (
        <div className="trace-empty">
          <p>Agent reasoning trace will appear here after each request.</p>
          <p className="trace-hint">Shows tool I/O, latency per step, and decision path.</p>
        </div>
      ) : (
        <div className="trace-steps">
          {trace.reason && (
            <div className="trace-reason">
              <strong>Reason:</strong> {trace.reason}
            </div>
          )}
          {trace.trace.map((step) => (
            <div key={step.step} className="trace-step">
              <div className="trace-step-header">
                <span className="step-num">Step {step.step}</span>
                <span className="step-tool">{step.tool}</span>
                <span className={`step-status ${statusClass[step.status]}`}>{step.status}</span>
                <span className="step-latency">{step.latency_ms.toFixed(1)} ms</span>
              </div>
              <div className="trace-io">
                <div className="io-block">
                  <span className="io-label">Input</span>
                  <pre>{JSON.stringify(step.input, null, 2)}</pre>
                </div>
                <div className="io-block">
                  <span className="io-label">Output</span>
                  <pre>{JSON.stringify(step.output, null, 2)}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
