import { GraduationCap, Presentation, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSession } from '@/lib/session';
import type { Role } from '@/lib/types';
import { useColors } from '@/theme';
import { SelectField } from './Sheet';
import { Text } from './Text';
import { Field } from './ui';

/** Student / teacher choice used at sign-up and in settings. */
export function RolePicker({ role, onChange }: { role: Role; onChange: (r: Role) => void }) {
  const c = useColors();
  const option = (id: Role, Icon: LucideIcon, title: string, sub: string) => {
    const on = role === id;
    return (
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: on }}
        onPress={() => onChange(id)}
        style={[styles.role, { backgroundColor: c.surfaceRaised, borderColor: on ? c.green : c.borderStrong }, on && { borderWidth: 2.5, padding: 11 }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon size={18} color={on ? c.green : c.text} />
          <Text w={700}>{title}</Text>
        </View>
        <Text size={12.5} color="muted">{sub}</Text>
      </Pressable>
    );
  };
  return (
    <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="I am a">
      {option('student', GraduationCap, 'Student', 'I’m in a class')}
      {option('teacher', Presentation, 'Teacher', 'I teach at EdVille')}
    </View>
  );
}

/** Class picker for students; optional timetable link for teachers. */
export function PlacementField({ role, className, timetableTeacher, onClass, onTimetable }: {
  role: Role;
  className: string;
  timetableTeacher: string;
  onClass: (v: string) => void;
  onTimetable: (v: string) => void;
}) {
  const { config } = useSession();
  if (role === 'teacher') {
    return (
      <Field label="Your timetable" optional hint="Your profile links to it once a moderator confirms you’re a teacher.">
        <SelectField
          title="Your timetable"
          value={timetableTeacher}
          placeholder="I’m not on the timetable"
          onChange={onTimetable}
          options={[{ value: '', label: 'I’m not on the timetable' }, ...(config?.teachers ?? []).map((t) => ({ value: t.slug, label: t.name }))]}
        />
      </Field>
    );
  }
  return (
    <Field label="Your class" hint="From the EdVille timetable. You can change it later in settings.">
      <SelectField
        title="Choose your class"
        value={className}
        placeholder="Choose your class"
        onChange={onClass}
        options={(config?.classes ?? []).map((cl) => ({ value: cl.name, label: cl.name }))}
      />
    </Field>
  );
}

const styles = StyleSheet.create({
  role: { flex: 1, gap: 2, padding: 12, borderRadius: 12, borderWidth: 1.5 },
});
