import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Ladeprotokoll } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [ladeprotokoll, setLadeprotokoll] = useState<Ladeprotokoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [ladeprotokollData] = await Promise.all([
        LivingAppsService.getLadeprotokoll(),
      ]);
      setLadeprotokoll(ladeprotokollData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [ladeprotokollData] = await Promise.all([
          LivingAppsService.getLadeprotokoll(),
        ]);
        setLadeprotokoll(ladeprotokollData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  return { ladeprotokoll, setLadeprotokoll, loading, error, fetchAll };
}