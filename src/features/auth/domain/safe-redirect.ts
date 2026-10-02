const DEFAULT_PATH = "/";

/**
 * Where to send the admin after login. Only same-site absolute paths are
 * accepted, so `?next=` cannot be abused as an open redirect.
 */
export function safeRedirectPath(next: string | string[] | null | undefined): string {
  const value = Array.isArray(next) ? next[0] : next;
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return DEFAULT_PATH;
  }
  if (value === "/login" || value.startsWith("/login?") || value.startsWith("/login/")) {
    return DEFAULT_PATH;
  }
  return value;
}
