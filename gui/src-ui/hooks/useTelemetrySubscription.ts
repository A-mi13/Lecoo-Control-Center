import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useTelemetryStore, type TelemetrySample } from '@/stores/telemetry';

export function useTelemetrySubscription() {
  const push = useTelemetryStore((s) => s.push);

  useEffect(() => {
    let cancelled = false;

    invoke<TelemetrySample | null>('get_telemetry')
      .then((initial) => {
        if (!cancelled && initial) push(initial);
      })
      .catch(() => {});

    const unlistenPromise = listen<TelemetrySample>('telemetry', (e) => {
      push(e.payload);
    });

    return () => {
      cancelled = true;
      unlistenPromise.then((fn) => fn()).catch(() => {});
    };
  }, [push]);
}
