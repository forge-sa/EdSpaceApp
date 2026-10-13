import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useScrollToTop } from 'expo-router';
import { Compass, GraduationCap, Presentation, Sparkles } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { ComposeFab, ComposePrompt, FeedList } from '@/components/Feed';
import { Button, Empty, Notice, Tabs } from '@/components/ui';
import { classHref } from '@/lib/links';
import { useMe } from '@/lib/session';
import type { FeedItem } from '@/lib/types';

type Tab = 'following' | 'discover' | 'class';
const KEY = 'edspace-home-tab';
const isTab = (v: unknown): v is Tab => v === 'following' || v === 'discover' || v === 'class';

export default function Home() {
  const me = useMe();
  const router = useRouter();
  const [tab, setTabState] = useState<Tab | null>(null);
  const list = useRef<FlatList<FeedItem>>(null);
  useScrollToTop(list);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => setTabState(isTab(v) ? v : 'following'))
      .catch(() => setTabState('following'));
  }, []);

  const setTab = (t: Tab) => {
    setTabState(t);
    AsyncStorage.setItem(KEY, t).catch(() => {});
  };

  // The third tab is your class, or the staff room for teachers.
  const teacher = me.role === 'teacher';
  const current = tab ?? 'following';
  const endpoint = {
    following: '/feed/following',
    discover: '/feed/discover',
    class: teacher ? '/feed/teachers' : `/feed/class/${encodeURIComponent(me.classSlug || me.className || '')}`,
  }[current];
  const groupHref = teacher ? '/teachers' : classHref(me.classSlug ?? '');

  const empty = {
    following: (
      <Empty
        icon={Sparkles}
        title="Your feed is quiet"
        action={
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button title={teacher ? 'Find colleagues' : 'Follow classmates'} onPress={() => router.push(groupHref)} />
            <Button title="See Discover" variant="outline" onPress={() => setTab('discover')} />
          </View>
        }
      >
        Follow {teacher ? 'colleagues and students' : 'classmates and friends'} to see their posts here — or say hi with your first post.
      </Empty>
    ),
    discover: <Empty icon={Compass} title="Nothing here yet">Be the first to post on EdSpace!</Empty>,
    class: teacher ? (
      <Empty icon={Presentation} title="No posts from teachers yet">Posts by confirmed teachers show up here.</Empty>
    ) : (
      <Empty icon={GraduationCap} title={`No posts from ${me.className} yet`}>Start the conversation for your class.</Empty>
    ),
  }[current];

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabs={[
          { id: 'following', label: 'Following' },
          { id: 'discover', label: 'Discover' },
          { id: 'class', label: teacher ? 'Teachers' : `Class ${me.className}` },
        ]}
        value={current}
        onChange={setTab}
      />
      {tab && (
        <FeedList
          key={endpoint}
          ref={list}
          endpoint={endpoint}
          empty={empty}
          header={
            <>
              {me.teacherStatus === 'pending' && (
                <Notice>A moderator will confirm your teacher account soon. Until then you can post as usual — the Teacher badge appears once you’re approved.</Notice>
              )}
              <ComposePrompt />
            </>
          }
        />
      )}
      <ComposeFab />
    </View>
  );
}
