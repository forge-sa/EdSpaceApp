# EdSpace for Android & iOS

The native app for [EdSpace](https://edville.space), the social network for EdVille
students and teachers. It is the mobile counterpart of `~/projects/website/EdSpace` and talks to
the same API, so accounts, posts and moderation are shared with the website.

Built with [Expo](https://expo.dev) (SDK 57, React Native 0.86) and Expo Router — one TypeScript
codebase for both platforms.

## Features

Everything the website does:

- Sign up with an `@edville.edu.kz` email and a 6-digit code (the pending sign-up survives the app
  being closed while you fetch the code), log in with email or `@username`, reset a password.
- Students pick their class; teachers can link their timetable and get the Teacher badge once a
  moderator approves them.
- Home feeds: Following, Discover, and your class (or the Teachers feed for teachers).
- Posts up to 300 characters with up to 4 photos (from the library or camera, resized on the
  device like the website does) and alt text; replies and threads, likes, reposts, bookmarks,
  share links, @mentions, #hashtags, links that open EdSpace pages in-app.
- Explore with search (posts, people, classes), trending tags and the class list.
- Classes and the Teachers staff room, with members and timetable links.
- Clubs: start one (a moderator approves it first), ask to join (the club's founder approves),
  post in a club you're in, and see its members. The founder or a moderator can delete a club.
- Profiles with banner, photo, bio, timetable, followers/following and Posts / Replies / Media /
  Likes; edit your profile.
- Notifications with an unread badge (checked every 45 s while the app is open, as on the web).
- Settings: class or teacher status, light / dark / system theme, password, log out, delete account.
- Moderation for moderators: teacher and club requests, reports, deleting posts, suspending accounts.

## Run it

```sh
npm install
npx expo start
```

Scan the QR code with **Expo Go** ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent),
[iOS](https://apps.apple.com/app/expo-go/id982107779)) — no Xcode or Android Studio needed. Press
`a` to open it in a running Android emulator.

The app uses the live server (`https://edville.space`) by default. To use a local one,
start the website's server and set `EXPO_PUBLIC_API_URL` in `.env.local` (see `.env.example`):

```sh
# in ~/projects/website/EdSpace/server — HOST=0.0.0.0 so phones on your Wi-Fi can reach it
HOST=0.0.0.0 PORT=3999 npm run dev
```

Without SMTP the server prints verification codes to its log.

## Build and publish

Builds run in the cloud with [EAS](https://docs.expo.dev/build/introduction/), so iOS builds work
from Linux too. You need an Expo account; iOS also needs an Apple Developer account.

```sh
npx eas-cli@latest login
npx eas-cli@latest build --profile preview --platform android   # installable .apk to share
npx eas-cli@latest build --profile production --platform all    # store builds (.aab + .ipa)
npx eas-cli@latest submit --platform ios                        # upload to App Store Connect / TestFlight
npx eas-cli@latest submit --platform android                    # upload to Google Play
```

The first build asks to link the project to your Expo account (it adds the project id to
`app.json`) and can create the signing keys for you.

App identifiers (`app.json`): `com.altynkhan.edspace` on both platforms. Change them before the
first store upload if you want something else — they can't change afterwards.

## Layout

```
src/app/            screens (Expo Router: every file is a route)
  (auth)/           welcome, log in, sign up, forgot password
  (app)/(tabs)/     Home, Explore, Classes, Notifications, your profile
  (app)/            post/[id], [handle] (/@handle), classes/[slug], teachers, clubs, clubs/[id],
                    search, bookmarks, settings, admin, compose, edit-profile and new-club (modals)
src/components/     UI: post card, feeds, sheets, profile, composer pieces…
src/lib/            API client, session, React Query setup, shared post store, image prep
src/theme/          the EdSpace palette (from the website's styles.css) and fonts
scripts/make-icons.sh  regenerates the app icon / splash from the favicon design
```

Routes mirror the website's paths (`/post/12`, `/@handle`, `/classes/10a`), so EdSpace links
inside posts open the right screen.

### How it talks to the server

The API sets an httpOnly session cookie, and the app's networking layer stores and sends cookies
like a browser, so the app uses the same session mechanism as the website — no server changes
were needed (tested on Android: the session survives killing and restarting the app). Mutating
requests send the `x-edspace: 1` header the server's CSRF check expects. Images under `/uploads`
are public.

Expo installs its own `fetch` as the global one. It doesn't accept React Native's old
`{ uri, name, type }` form-data parts, so uploads append an `expo-file-system` `File` instead
(`src/lib/image.ts`).

## Checks

```sh
npx tsc --noEmit
npx expo lint
npx expo-doctor
```

## Not included yet

- **Push notifications** — the server has no push support; notifications show when the app is
  opened (and the badge refreshes every 45 s while it's open).
- **Opening edville.space links in the app from outside** (universal / app links) — needs
  `apple-app-site-association` and `assetlinks.json` served by the website. The `edspace://`
  scheme works already, e.g. `edspace:///post/12`.
