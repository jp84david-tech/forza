import { useCallback, useEffect, useState } from 'react';
import { getState } from '../state/store';

/**
 * Data-loading boundary. Screens call `useResource(key)` before rendering data
 * that would come from the network in production. The first load of a key
 * shows skeletons for a moment; after that it's cached for the session, so
 * going back to a screen is instant.
 *
 * With Settings → Demo tools → "Simulate network errors" turned on, the first
 * attempt for each key fails so the error and retry states can be checked.
 */

const loaded = new Set<string>();
const failedOnce = new Set<string>();

export type LoadStatus = 'loading' | 'ready' | 'error';

export function useResource(key: string, latency = 450): { status: LoadStatus; retry: () => void } {
  const [status, setStatus] = useState<LoadStatus>(loaded.has(key) ? 'ready' : 'loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (loaded.has(key)) {
      setStatus('ready');
      return;
    }
    setStatus('loading');
    const t = setTimeout(() => {
      if (getState().settings.simulateErrors && !failedOnce.has(key)) {
        failedOnce.add(key);
        setStatus('error');
        return;
      }
      loaded.add(key);
      setStatus('ready');
    }, latency);
    return () => clearTimeout(t);
  }, [key, attempt, latency]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { status, retry };
}

/** Forget cached keys (used after "Simulate network errors" is switched on). */
export function clearResourceCache() {
  loaded.clear();
  failedOnce.clear();
}
