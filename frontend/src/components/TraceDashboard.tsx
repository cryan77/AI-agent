import type { ChatResponse, RunMetrics, TraceCategory } from "../types";
import { CATEGORY_LABELS } from "../types";

interface Props {
  trace: ChatResponse | null;
  metrics: RunMetrics;
}

const statusClass: Record<string, string> = {
  success: "status-success",
  error: "status-error",
  retry: "status-retry",
};

const categoryClass: Record<TraceCategory, string> = {
  crm_lookup: "cat-crm",
  policy_check: "cat-policy",
  decision: "cat-decision",
  reasoning: "cat-reasoning",
};

function formatOutput(output: Record<string, unknown> | string): string {
  return typeof output === "string" ? output : JSON.stringify(output, null, 2);
}

export default function TraceDashboard({ trace, metrics }: Props) {
  const errorSteps = trace?.trace.filter((s) => s.status === "error") ?? [];

  return (
    <section className="panel trace-panel anim-panel-in">
      <div className="panel-header">
        <h2>Admin Dashboard</h2>
        <span className="panel-tag">Debug Panel</span>
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
          <span className="metric-label">Retries / Errors</span>
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
          <p>Agent trace will appear here after each request.</p>
          <p className="trace-hint">
            Shows database lookups, policy checks, agent reasoning, decisions, and errors/retries.
          </p>
        </div>
      ) : (
        <div className="trace-steps">
          {trace.reason && (
            <div className="trace-reason">
              <strong>Final reason:</strong> {trace.reason}
            </div>
          )}

          {errorSteps.length > 0 && (
            <div className="trace-errors">
              <strong>Errors / blocked retries ({errorSteps.length})</strong>
              <p className="trace-hint">
                e.g. approve_refund blocked by policy — agent should retry with deny or escalate.
              </p>
            </div>
          )}

          {trace.trace.map((step) => (
            <div key={step.step} className={`trace-step ${step.status === "error" ? "trace-step-error" : ""}`}>
              <div className="trace-step-header">
                <span className="step-num">Step {step.step}</span>
                <span className={`step-category ${categoryClass[step.category]}`}>
                  {CATEGORY_LABELS[step.category]}
                </span>
                <span className="step-tool">{step.tool}</span>
                <span className={`step-status ${statusClass[step.status]}`}>{step.status}</span>
                {step.latency_ms > 0 && (
                  <span className="step-latency">{step.latency_ms.toFixed(1)} ms</span>
                )}
              </div>
              {step.category === "reasoning" ? (
                <div className="reasoning-block">
                  <pre>{formatOutput(step.output)}</pre>
                  {Array.isArray(step.input.planned_tools) && step.input.planned_tools.length > 0 && (
                    <p className="planned-tools">
                      Planned tools: {(step.input.planned_tools as string[]).join(", ")}
                    </p>
                  )}
                </div>
              ) : (
                <div className="trace-io">
                  <div className="io-block">
                    <span className="io-label">Input</span>
                    <pre>{JSON.stringify(step.input, null, 2)}</pre>
                  </div>
                  <div className="io-block">
                    <span className="io-label">Output</span>
                    <pre>{formatOutput(step.output)}</pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
