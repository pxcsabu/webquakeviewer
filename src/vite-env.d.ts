/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_SAMPLE_DATA?: string;
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
