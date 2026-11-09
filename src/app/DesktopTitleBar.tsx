import { useState, type MouseEvent } from 'react';

type WindowAction = 'minimize' | 'toggleMaximize' | 'close';

/**
 * The Windows Tauri window uses a frameless decoration so the app can draw its
 * own title bar. Web builds, macOS, and Linux keep their native decorations.
 */
export function isDesktopWindows(): boolean {
  return (
    typeof window !== 'undefined' &&
    '__TAURI_INTERNALS__' in window &&
    /Windows/i.test(navigator.userAgent)
  );
}

async function runWindowAction(action: WindowAction): Promise<void> {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const window = getCurrentWindow();
  if (action === 'minimize') {
    await window.minimize();
  } else if (action === 'toggleMaximize') {
    await window.toggleMaximize();
  } else {
    await window.close();
  }
}

function invokeWindowAction(action: WindowAction): void {
  void runWindowAction(action).catch((error: unknown) => {
    console.error('ウィンドウ操作に失敗しました', error);
  });
}

export function DesktopTitleBar() {
  const [busy, setBusy] = useState(false);

  const onDoubleClick = (_event: MouseEvent<HTMLDivElement>): void => {
    invokeWindowAction('toggleMaximize');
  };

  return (
    <div className="desktop-titlebar">
      <div
        className="desktop-titlebar-drag"
        data-tauri-drag-region
        onDoubleClick={onDoubleClick}
      >
        <span className="desktop-titlebar-mark" aria-hidden="true">
          ◈
        </span>
        <span className="desktop-titlebar-title">EarthScope</span>
        <span className="desktop-titlebar-subtitle">日本周辺の地震観測</span>
      </div>
      <div className="desktop-titlebar-controls">
        <button
          type="button"
          className="desktop-titlebar-button"
          aria-label="最小化"
          title="最小化"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            invokeWindowAction('minimize');
            window.setTimeout(() => setBusy(false), 300);
          }}
        >
          <span aria-hidden="true">—</span>
        </button>
        <button
          type="button"
          className="desktop-titlebar-button"
          aria-label="最大化または元に戻す"
          title="最大化または元に戻す"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            invokeWindowAction('toggleMaximize');
            window.setTimeout(() => setBusy(false), 300);
          }}
        >
          <span aria-hidden="true">□</span>
        </button>
        <button
          type="button"
          className="desktop-titlebar-button desktop-titlebar-close"
          aria-label="閉じる"
          title="閉じる"
          onClick={() => invokeWindowAction('close')}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  );
}
