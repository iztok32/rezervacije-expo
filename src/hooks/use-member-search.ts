import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import type { Member } from '@/lib/types';

/** Iskanje članov na strežniku (GET /members) z zamikom, da ne kličemo ob vsaki črki. */
export function useMemberSearch(enabled: boolean) {
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      api.get<{ data: Member[] }>(`/members?search=${encodeURIComponent(query.trim())}`).then(
        (res) => {
          if (cancelled) return;
          setMembers(res.data);
          setLoading(false);
        },
        () => {
          if (!cancelled) setLoading(false);
        },
      );
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, query]);

  return { members, loading, search: setQuery };
}
