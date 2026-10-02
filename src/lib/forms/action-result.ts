/**
 * Result of a one-click Server Action (publish, activate, delete…): a message,
 * plus warnings on success or the list of what blocked it on failure.
 */
export type ActionResult = { ok: true; message: string; warnings: string[] } | { ok: false; message: string; problems: string[] };

export function actionSuccess(message: string, warnings: string[] = []): ActionResult {
  return { ok: true, message, warnings };
}

export function actionFailure(message: string, problems: string[] = []): ActionResult {
  return { ok: false, message, problems };
}
