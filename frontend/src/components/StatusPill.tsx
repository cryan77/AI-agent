import { DECISION_BADGE, DECISION_LABEL, PENDING_BADGE } from "../lib/decisionBadge";

export type StatusKind = "approved" | "denied" | "escalated" | "pending";

interface Props {
  status: StatusKind;
  label?: string;
  className?: string;
}

export default function StatusPill({ status, label, className = "" }: Props) {
  const badgeClass = status === "pending" ? PENDING_BADGE : DECISION_BADGE[status];
  const text = label ?? (status === "pending" ? "Pending" : DECISION_LABEL[status]);

  return <span className={`status-pill ${badgeClass} ${className}`.trim()}>{text}</span>;
}
