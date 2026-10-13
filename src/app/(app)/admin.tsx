import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, Stack, useRouter } from 'expo-router';
import { Ban, BadgeCheck, CalendarDays, Check, Flag, Mail, Presentation, ShieldCheck, Trash2, X } from 'lucide-react-native';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { PostCard, Tombstone } from '@/components/PostCard';
import { Span, Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { Button, Empty, Loading, Pill } from '@/components/ui';
import { api, del, errorMessage, post } from '@/lib/api';
import { shortTime } from '@/lib/format';
import { openExternal, profileHref } from '@/lib/links';
import { markDeleted, putPosts } from '@/lib/postStore';
import { useRefresh } from '@/lib/queries';
import { useMe, useSession } from '@/lib/session';
import type { Report, TeacherRequest } from '@/lib/types';
import { useColors } from '@/theme';

export default function Admin() {
  const me = useMe();
  if (!me.isAdmin) return <Redirect href="/" />;
  return <Moderation />;
}

function Moderation() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const client = useQueryClient();
  const { refreshUnread } = useSession();

  const reports = useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: async () => {
      const d = await api<{ reports: Report[] }>('/admin/reports');
      putPosts(d.reports.map((r) => r.post));
      return d.reports;
    },
  });
  const teachers = useQuery({
    queryKey: ['admin', 'teachers'],
    queryFn: () => api<{ teachers: TeacherRequest[] }>('/admin/teachers').then((d) => d.teachers),
  });
  const { refreshing, onRefresh } = useRefresh(() => Promise.all([reports.refetch(), teachers.refetch(), refreshUnread()]));

  const dropReports = (pred: (r: Report) => boolean) =>
    client.setQueryData<Report[]>(['admin', 'reports'], (list) => list?.filter((r) => !pred(r)));

  const decideTeacher = async (t: TeacherRequest, approve: boolean) => {
    try {
      await post(`/admin/teachers/${t.handle}/${approve ? 'approve' : 'decline'}`);
      client.setQueryData<TeacherRequest[]>(['admin', 'teachers'], (list) => list?.filter((x) => x.id !== t.id));
      toast(approve ? `${t.displayName} is now a confirmed teacher` : 'Request declined', approve ? 'success' : 'info');
      refreshUnread();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const confirm = (title: string, message: string, action: string, run: () => Promise<void>) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: action, style: 'destructive', onPress: () => run().catch((err) => toast(errorMessage(err), 'error')) },
    ]);

  const dismiss = async (r: Report) => {
    try {
      await post(`/admin/reports/${r.id}/dismiss`);
      dropReports((x) => x.id === r.id);
      toast('Report dismissed');
      refreshUnread();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const deletePost = (r: Report) =>
    confirm('Delete this post?', 'This can’t be undone.', 'Delete', async () => {
      await del(`/posts/${r.post!.id}`);
      markDeleted(r.post!.id);
      dropReports((x) => x.post?.id === r.post!.id);
      toast('Post deleted');
      refreshUnread();
    });

  const suspend = (r: Report) =>
    confirm('Suspend author?', `Suspend @${r.post!.author.handle}? They’ll be logged out and their posts hidden.`, 'Suspend', async () => {
      await post(`/admin/users/${r.post!.author.handle}/ban`);
      dropReports((x) => x.post?.author.id === r.post!.author.id);
      toast('Account suspended');
      refreshUnread();
    });

  const heading = (Icon: typeof Flag, title: string, count?: number) => (
    <View style={[styles.heading, { borderTopColor: c.border }]}>
      <Icon size={18} color={c.text} />
      <Text w={800} size={17}>{title}</Text>
      {count ? <Pill>{count}</Pill> : null}
    </View>
  );

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.green} colors={[c.green]} />}>
      <Stack.Screen options={{ title: 'Moderation' }} />

      {heading(Presentation, 'Teacher requests', teachers.data?.length)}
      {teachers.isPending ? <Loading /> : !teachers.data?.length ? (
        <Text size={14} color="muted" style={{ paddingHorizontal: 16, paddingBottom: 16 }}>No one is waiting for approval.</Text>
      ) : teachers.data.map((t) => (
        <View key={t.id} style={[styles.request, { borderTopColor: c.border }]}>
          <Avatar user={t} />
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <Text numberOfLines={1}>
              <Span w={700} onPress={() => router.push(profileHref(t.handle))}>{t.displayName}</Span>
              <Span color="muted"> @{t.handle} · {shortTime(t.createdAt)}</Span>
            </Text>
            <View style={styles.hint}><Mail size={13} color={c.muted} /><Text size={13} color="muted" style={{ flex: 1 }}>{t.email}</Text></View>
            <View style={styles.hint}>
              <CalendarDays size={13} color={c.muted} />
              {t.claimedTimetable ? (
                <Text size={13} color="muted" style={{ flex: 1 }}>
                  Says they’re <Span w={600} color="greenDeep" onPress={() => openExternal(t.claimedTimetable!.timetableUrl)}>{t.claimedTimetable.name}</Span> on the timetable
                </Text>
              ) : <Text size={13} color="muted">Didn’t link a timetable</Text>}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Button title="Approve" icon={BadgeCheck} size="sm" onPress={() => decideTeacher(t, true)} />
              <Button title="Decline" icon={X} size="sm" variant="outline" onPress={() => decideTeacher(t, false)} />
            </View>
          </View>
        </View>
      ))}

      {heading(Flag, 'Reports', reports.data?.length)}
      {reports.isPending ? <Loading /> : !reports.data?.length ? (
        <Empty icon={ShieldCheck} title="All clear">No open reports right now.</Empty>
      ) : reports.data.map((r) => (
        <View key={r.id} style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }}>
          <View style={styles.why}>
            <Flag size={16} color={c.danger} style={{ marginTop: 2 }} />
            <Text size={14} color="muted" style={{ flex: 1 }}>
              <Span w={700} color="text">@{r.reporter.handle}</Span> · {shortTime(r.createdAt)} · “{r.reason}”
            </Text>
          </View>
          {r.post ? <PostCard post={r.post} borderless showDeleted /> : <Tombstone>Post no longer available.</Tombstone>}
          <View style={styles.tools}>
            {r.post && <Button title="Delete post" icon={Trash2} size="sm" variant="danger" onPress={() => deletePost(r)} />}
            {r.post && !r.post.author.isAdmin && <Button title="Suspend author" icon={Ban} size="sm" variant="dangerOutline" onPress={() => suspend(r)} />}
            <Button title="Dismiss" icon={Check} size="sm" variant="outline" onPress={() => dismiss(r)} />
          </View>
        </View>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 18, paddingBottom: 10, paddingHorizontal: 16 },
  request: { flexDirection: 'row', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  why: { flexDirection: 'row', gap: 8, paddingTop: 12, paddingHorizontal: 16 },
  tools: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 72, paddingRight: 16, paddingBottom: 14 },
});
