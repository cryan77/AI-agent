import { DECISION_BADGE, DECISION_LABEL, GENERAL_BADGE, GENERAL_LABEL } from "../lib/decisionBadge";

export type RefundStatus = "approved" | "denied" | "escalated";
export type StatusKind = RefundStatus | "general";

interface Props {
  status: StatusKind;
  label?: string;
  className?: string;
}

export default function StatusPill({ status, label, className = "" }: Props) {
  const badgeClass = status === "general" ? GENERAL_BADGE : DECISION_BADGE[status];
  const text = label ?? (status === "general" ? GENERAL_LABEL : DECISION_LABEL[status]);

  return <span className={`status-pill ${badgeClass} ${className}`.trim()}>{text}</span>;
}
