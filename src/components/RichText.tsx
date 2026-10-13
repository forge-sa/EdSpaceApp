import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { internalHref, openExternal, profileHref, searchHref } from '@/lib/links';
import { Span, Text, type Props as TextProps } from './Text';

// One pass over the text finds URLs, @mentions and #hashtags (same rules as
// the website and the server's notification parser).
const TOKEN = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])|(^|[^\w@])@([a-zA-Z0-9_]{3,20})\b|(^|[^\w#&])#([\p{L}\p{N}_]{2,40})/gu;

export function RichText({ text, ...props }: { text: string } & TextProps) {
  const router = useRouter();
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of text.matchAll(TOKEN)) {
    const [whole, url, mentionLead, handle, tagLead, tag] = m;
    const lead = mentionLead ?? tagLead ?? '';
    const start = (m.index ?? 0) + lead.length;
    if (start > last) parts.push(text.slice(last, start));
    if (url) {
      const shown = url.replace(/^https?:\/\/(www\.)?/, '');
      parts.push(
        <Span
          key={key++}
          w={600}
          color="greenDeep"
          accessibilityRole="link"
          onPress={() => {
            const href = internalHref(url);
            if (href) router.push(href);
            else openExternal(url);
          }}
        >
          {shown.length > 40 ? shown.slice(0, 38) + '…' : shown}
        </Span>,
      );
    } else if (handle) {
      parts.push(
        <Span key={key++} w={600} color="greenDeep" accessibilityRole="link" onPress={() => router.push(profileHref(handle.toLowerCase()))}>
          @{handle}
        </Span>,
      );
    } else if (tag) {
      parts.push(
        <Span key={key++} w={600} color="greenDeep" accessibilityRole="link" onPress={() => router.push(searchHref('#' + tag))}>
          #{tag}
        </Span>,
      );
    }
    last = (m.index ?? 0) + whole.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <Text {...props}>{parts}</Text>;
}
