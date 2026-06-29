// Escape untrusted (tenant-/DB-controlled) strings before interpolating them
// into outbound HTML email bodies, so a value like a business name or request
// title cannot inject markup (e.g. phishing links) into emails sent to landlords.
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
