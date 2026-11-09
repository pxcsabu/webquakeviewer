/**
 * Tauri injects its internal bridge before the React entry point runs.
 * Web builds do not have this object. Use this for desktop-only UI, not for
 * OS-specific behavior; Windows-specific UI is handled separately.
 */
export function isTauriRuntime(): boolean {
  return (
    typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
  );
}
