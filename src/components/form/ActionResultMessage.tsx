import type { ActionResult } from "@/lib/forms/action-result";

/** Server answer to a one-click action: success with warnings, or failure with what to fix. */
export function ActionResultMessage({ result }: { result: ActionResult }) {
  const items = result.ok ? result.warnings : result.problems;
  return (
    <div
      role={result.ok ? "status" : "alert"}
      className={`rounded-md px-3 py-2 text-sm ${result.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
    >
      <p>{result.message}</p>
      {items.length > 0 && (
        <ul className="mt-1 list-disc pl-5">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
