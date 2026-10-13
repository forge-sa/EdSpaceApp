import { useRouter } from 'expo-router';
import { CircleQuestionMark } from 'lucide-react-native';
import { View } from 'react-native';
import { Button, Empty } from '@/components/ui';
import { useColors } from '@/theme';

export default function NotFoundScreen() {
  const c = useColors();
  const router = useRouter();
  return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: c.surface }}>
      <Empty icon={CircleQuestionMark} title="This page doesn’t exist" action={<Button title="Go home" onPress={() => router.replace('/')} />}>
        The link may be broken, or the page may have been removed.
      </Empty>
    </View>
  );
}
