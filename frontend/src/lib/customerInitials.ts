export function customerInitials(name: string, id: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  if (parts[0] && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return id.replace(/\D/g, "").slice(-2).padStart(2, "0").toUpperCase() || "??";
}
