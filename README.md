# GameVault for iPhone

GameVault is an **iOS-only, offline-first gaming collection** app built with React Native, Expo and a local SQLite database. It does not use Supabase, Firebase, a web account or a cloud database.

## Features
- Home, Library, Discover, Activity, and Profile tabs
- Add games and manage platforms, genres, statuses, favorites, ratings and progress
- Log gaming sessions and review playtime
- Discover suggestions that work offline
- Export your collection to a JSON backup; restore from the iPhone Files picker
- Migrate data exported from the earlier [Safari design preview](https://gamevault-ios-preview.vercel.app)

Demo entries are explicitly marked and can be cleared from Profile without deleting edited items or games with sessions.

## Local development
Install Node.js 22+ and then run:

```bash
npm install
npm run test:backup
npm run test:config
npm run check
npx expo-doctor
npx expo start
```

## iPhone / TestFlight
1. Expo Launch currently requires a **public GitHub repository**. To switch visibility, open [GitHub repository settings](https://github.com/ibrolee/gamevault-ios/settings), then General → Danger Zone → Change repository visibility → Public. Public source code is visible to anyone; do not commit credentials or secrets.
2. Sign in to your Expo account using [Expo Launch](https://launch.expo.dev/) on your iPhone, and enter **https://github.com/ibrolee/gamevault-ios**.
3. Authorize your Apple Developer account through Expo's authentication flow.
4. Build for **iOS** with the **production** profile in `eas.json`.
5. Upload the signed build to TestFlight and complete Apple's beta review if required.

If you use the CLI instead:

```bash
npx eas-cli login
npx eas-cli build:configure -p ios
npx eas-cli build --platform ios --profile production --auto-submit
```

Expo project linking, Apple signing, an actual .ipa build and TestFlight submission have **not** yet been performed. The app's bundle identifier is `com.ibrolee.gamevault`; change it only if that identifier is unavailable for the Apple team.

## Data
All live data resides in on-device SQLite. Backups are imported or exported by explicit action; Safari data does not sync automatically. Importing a backup replaces the local library, so export your existing data first.

## Source readiness
The native source and EAS settings have been committed to this GitHub repository. Source tests cover backup validity, iOS-only settings, and Safari-preview migration. Full dependency installation and an iPhone build must still be verified.
