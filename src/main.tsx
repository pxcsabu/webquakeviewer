import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { ErrorBoundary } from './app/ErrorBoundary';
import './app/app.css';


/**
 * Tauri WebView does not open target="_blank" links in the system browser by
 * default. Preserve the existing external-link behavior without changing the
 * web build: only the desktop runtime installs this interceptor, and only
 * HTTP(S) URLs are forwarded to the OS.
 */
function installDesktopExternalLinkHandler(): void {
  if (!('__TAURI_INTERNALS__' in window)) {
    return;
  }
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }
      if (!/^https?:\/\//i.test(anchor.href)) {
        return;
      }
      event.preventDefault();
      void import('@tauri-apps/plugin-opener')
        .then(({ openUrl }) => openUrl(anchor.href))
        .catch((error: unknown) => {
          console.error('外部リンクを開けませんでした', error);
        });
    },
    true,
  );
}

installDesktopExternalLinkHandler();

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('#root 要素が見つかりません。');
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
