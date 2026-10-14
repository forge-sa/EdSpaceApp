// JSON shapes returned by the EdSpace API (see server/src/views.js).

export type Role = 'student' | 'teacher';
export type TeacherStatus = 'pending' | 'approved' | 'declined' | null;

export interface UserSummary {
  id: number;
  handle: string;
  displayName: string;
  avatar: string | null;
  role: Role;
  isTeacher: boolean;
  className: string | null;
  classSlug: string | null;
  isAdmin: boolean;
}

/** The signed-in user's own record. */
export interface Me extends UserSummary {
  email: string;
  bio: string;
  banner: string | null;
  createdAt: number;
  teacherStatus: TeacherStatus;
  timetableTeacher: { slug: string; name: string; timetableUrl: string } | null;
}

export interface Profile extends UserSummary {
  bio: string;
  banner: string | null;
  createdAt: number;
  timetableUrl: string | null;
  isBanned: boolean;
  counts: { followers: number; following: number; posts: number };
  viewer: { following: boolean; followsYou: boolean; isSelf: boolean };
}

/** A user in a list (followers, search, class members…). */
export interface ListUser extends UserSummary {
  bio: string;
  viewer: { following: boolean; isSelf: boolean };
}

export interface PostImage {
  url: string;
  width: number | null;
  height: number | null;
  alt: string;
}

export interface Post {
  id: number;
  text: string;
  createdAt: number;
  deleted: boolean;
  author: UserSummary;
  images: PostImage[];
  replyTo: { id: number; handle: string | null } | null;
  rootId: number | null;
  /** The club it was posted in, if any. */
  club: { id: number; name: string } | null;
  counts: { likes: number; reposts: number; replies: number };
  viewer: { liked: boolean; reposted: boolean; bookmarked: boolean };
}

export interface FeedItem {
  key: string;
  post: Post;
  repostedBy: { handle: string; displayName: string } | null;
}

export interface FeedPage {
  items: FeedItem[];
  cursor: string | null;
}

export interface ClassInfo {
  name: string;
  slug: string;
  timetableUrl: string;
  members?: number;
}

export interface TimetableTeacher {
  name: string;
  slug: string;
  timetableUrl: string;
}

export interface AppConfig {
  emailDomain: string;
  classes: ClassInfo[];
  teachers: TimetableTeacher[];
  postMaxLength: number;
  mailConfigured: boolean;
}

export type ClubStatus = 'pending' | 'approved' | 'declined';

/** A student club. Only approved clubs are public; the rest are the founder's requests. */
export interface Club {
  id: number;
  name: string;
  description: string;
  status: ClubStatus;
  createdAt: number;
  /** null when the founder's account is suspended or deleted. */
  owner: UserSummary | null;
  members: number;
  viewer: { isMember: boolean; isOwner: boolean };
}

export type NotificationType = 'like' | 'repost' | 'follow' | 'reply' | 'mention' | 'teacher_approved' | 'club_approved' | 'club_declined';

export interface Notification {
  id: number;
  type: NotificationType;
  createdAt: number;
  read: boolean;
  actor: UserSummary;
  post: Post | null;
  club: { id: number; name: string; status: ClubStatus } | null;
}

export interface Report {
  id: number;
  reason: string;
  createdAt: number;
  reporter: UserSummary;
  post: Post | null;
}

export interface TeacherRequest extends UserSummary {
  email: string;
  createdAt: number;
  claimedTimetable: { name: string; timetableUrl: string } | null;
}
