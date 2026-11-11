import { useCallback, useEffect, useState } from 'react';
import { loadAIImpactSnapshot } from './service';
import type { AIImpactSnapshot, ImpactLoadState } from './types';

/** Isolated async snapshot state; unmounts and role switches cannot apply stale results. */
export function useAIImpactSnapshot(isAdmin: boolean) {
  const [snapshot, setSnapshot] = useState<AIImpactSnapshot | null>(null);
  const [state, setState] = useState<ImpactLoadState>('loading');
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let active = true;
    setState('loading');
    setSnapshot(null);
    loadAIImpactSnapshot(isAdmin)
      .then(data => {
        if (!active) return;
        setSnapshot(data);
        setState(data ? 'ready' : 'missing');
      })
      .catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [isAdmin, revision]);
  return { snapshot, state, refresh };
}
