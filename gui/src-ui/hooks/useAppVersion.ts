import { useEffect, useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';

// Cache so multiple components don't all kick off the same async fetch on
// first paint. getVersion() reads what Tauri burned into the bundle, which
// in turn comes from gui/tauri.conf.json — the single place we set the
// version when cutting a release.
let cached: string | null = null;
let inflight: Promise<string> | null = null;

function load(): Promise<string> {
  if (cached !== null) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = getVersion()
    .then((v) => {
      cached = v;
      return v;
    })
    .catch(() => {
      cached = 'dev';
      return 'dev';
    });
  return inflight;
}

/** Returns the application version, reading from Tauri once and caching. */
export function useAppVersion(): string {
  const [version, setVersion] = useState<string>(cached ?? '…');

  useEffect(() => {
    if (cached !== null) return;
    let alive = true;
    load().then((v) => {
      if (alive) setVersion(v);
    });
    return () => {
      alive = false;
    };
  }, []);

  return version;
}
