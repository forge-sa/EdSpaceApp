import { Stack } from 'expo-router';
import { Bookmark } from 'lucide-react-native';
import { View } from 'react-native';
import { FeedList } from '@/components/Feed';
import { Empty } from '@/components/ui';

export default function Bookmarks() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Bookmarks' }} />
      <FeedList
        endpoint="/bookmarks"
        empty={<Empty icon={Bookmark} title="Save posts for later">Tap the bookmark on any post to keep it here. Only you can see your bookmarks.</Empty>}
      />
    </View>
  );
}
