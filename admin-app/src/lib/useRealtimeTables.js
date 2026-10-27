import { useEffect, useRef } from 'react';
import { supabase, syncRealtimeAuth } from './supabaseClient.js';

/**
 * Subscribes to postgres_changes on the given tables and calls onChange
 * (with no args — callers just refetch) whenever any row changes. RLS
 * still applies: a staff member only receives events for rows is_staff()
 * (or ownership, for appointments/payments) lets them see.
 */
export function useRealtimeTables(tables, onChange) {
  // The subscription effect below intentionally only depends on the table
  // list, not onChange, so it doesn't resubscribe on every render. But that
  // means it must never call onChange directly — a stale closure captured
  // at mount (e.g. a `load` bound to whatever date filter was selected
  // then) would keep firing forever, silently refetching the wrong data
  // on every future change even after filters move on. Routing the call
  // through a ref that's kept current every render fixes that without
  // needing to resubscribe.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    let cancelled = false;
    let channel;

    (async () => {
      await syncRealtimeAuth();
      if (cancelled) return;

      channel = supabase.channel(`admin-realtime-${tables.join('-')}`);
      for (const table of tables) {
        channel.on('postgres_changes', { event: '*', schema: 'public', table }, (...args) => onChangeRef.current(...args));
      }
      channel.subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join(',')]);
}
