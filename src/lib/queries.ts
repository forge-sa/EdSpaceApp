import { focusManager, QueryClient, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { api } from './api';
import { putPosts } from './postStore';
import type { FeedItem, FeedPage } from './types';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

// Treat the app coming to the foreground like a browser tab regaining focus.
focusManager.setEventListener((setFocused) => {
  const sub = AppState.addEventListener('change', (state) => setFocused(state === 'active'));
  return () => sub.remove();
});

export const feedKey = (endpoint: string) => ['feed', endpoint] as const;

/** New posts can land in many feeds; refetch the visible ones, mark the rest stale. */
export const invalidateFeeds = () => queryClient.invalidateQueries({ queryKey: ['feed'] });

/**
 * A paginated feed endpoint (anything returning { items, cursor }).
 * Posts are deduplicated across pages, as the website does.
 */
export function useFeed(endpoint: string, enabled = true, onRefreshExtra?: () => Promise<unknown>) {
  const client = useQueryClient();
  const key = feedKey(endpoint);
  const query = useInfiniteQuery({
    queryKey: key,
    enabled,
    initialPageParam: null as string | null,
    getNextPageParam: (last: FeedPage) => last.cursor,
    queryFn: async ({ pageParam, signal }) => {
      const sep = endpoint.includes('?') ? '&' : '?';
      const page = await api<FeedPage>(pageParam ? `${endpoint}${sep}cursor=${encodeURIComponent(pageParam)}` : endpoint, { signal });
      putPosts(page.items.map((i) => i.post));
      return page;
    },
  });

  const items = useMemo(() => {
    const seen = new Set<number>();
    const out: FeedItem[] = [];
    for (const page of query.data?.pages ?? []) {
      for (const item of page.items) {
        if (seen.has(item.post.id)) continue;
        seen.add(item.post.id);
        out.push(item);
      }
    }
    return out;
  }, [query.data]);

  const refresh = useRefresh(async () => {
    // Start over from the first page instead of refetching every loaded page.
    client.setQueryData(key, (d: typeof query.data) => d && { pages: d.pages.slice(0, 1), pageParams: d.pageParams.slice(0, 1) });
    await Promise.all([query.refetch(), onRefreshExtra?.()]);
  });

  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage && !query.isError) query.fetchNextPage();
  }, [query]);

  return { ...query, items, ...refresh, loadMore };
}

/** Pull-to-refresh state that only reflects refreshes the user asked for. */
export function useRefresh(fn: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fn();
    } catch {
      // The query shows its own error state.
    } finally {
      setRefreshing(false);
    }
  }, [fn]);
  return { refreshing, onRefresh };
}
