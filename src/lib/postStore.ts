import { useSyncExternalStore } from 'react';
import type { Post } from './types';

// One shared copy of every post the app has loaded. Screens stay mounted in
// the navigation stack, so a like on the thread screen has to show up in the
// feed underneath it: cards read the latest version from here, and every
// fetch and optimistic update writes to it.

const posts = new Map<number, Post>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const emit = () => listeners.forEach((l) => l());

export function putPosts(list: (Post | null | undefined)[]) {
  let changed = false;
  for (const p of list) {
    if (!p) continue;
    posts.set(p.id, p);
    changed = true;
  }
  if (changed) emit();
}

export const putPost = (p: Post | null | undefined) => putPosts([p]);
export const getPost = (id: number) => posts.get(id);

export function markDeleted(id: number) {
  const p = posts.get(id);
  if (!p) return;
  posts.set(id, { ...p, deleted: true, text: '', images: [] });
  emit();
}

export function clearPosts() {
  posts.clear();
  emit();
}

/** The freshest copy of `post`. */
export function usePost(post: Post): Post {
  return useSyncExternalStore(subscribe, () => posts.get(post.id) ?? post);
}

export function usePostById(id: number | null | undefined): Post | undefined {
  return useSyncExternalStore(subscribe, () => (id == null ? undefined : posts.get(id)));
}
