import { useQueryClient } from '@tanstack/react-query';
import { useScrollToTop } from 'expo-router';
import { useRef } from 'react';
import { FlatList, View } from 'react-native';
import { ComposeFab, FeedList } from '@/components/Feed';
import { ClassStrip, SearchBox, Trending } from '@/components/Search';
import { Empty, SectionTitle } from '@/components/ui';
import type { FeedItem } from '@/lib/types';

export default function Explore() {
  const list = useRef<FlatList<FeedItem>>(null);
  const client = useQueryClient();
  useScrollToTop(list);
  return (
    <View style={{ flex: 1 }}>
      <FeedList
        ref={list}
        endpoint="/feed/discover"
        onRefreshExtra={() => Promise.all([client.refetchQueries({ queryKey: ['trending'] }), client.refetchQueries({ queryKey: ['classes'] })])}
        keyboardShouldPersistTaps="handled"
        header={
          <>
            <SearchBox />
            <Trending />
            <ClassStrip />
            <SectionTitle>Latest on EdSpace</SectionTitle>
          </>
        }
        empty={<Empty title="No posts yet">Be the first!</Empty>}
      />
      <ComposeFab />
    </View>
  );
}
