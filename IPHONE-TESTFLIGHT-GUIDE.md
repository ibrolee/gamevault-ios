# GameVault: iPhone-only TestFlight launch

This package contains the **native Expo source**, not a signed iPhone app. The Safari demonstration at https://gamevault-ios-preview.vercel.app remains separate.

## Best route if you use only your iPhone (no computer)

**Expo Launch:** https://launch.expo.dev/ supports launching a GitHub-hosted Expo app through a browser. It is in beta; prompts and eligibility may vary.

1. In iPhone Safari open https://github.com/new while signed in to your own GitHub account.
2. Create an empty **private** repository such as `gamevault-ios`. **Check Add a README file** so the repository has an initial commit. Do not add a license or .gitignore at creation; the project archive already contains those as needed. The placeholder README can be replaced when the project files are committed.
3. Send ChatGPT the new repository URL. If the connected GitHub integration has repository write access, ChatGPT can commit this package into the empty repository. Otherwise upload files using GitHub's web interface or a Git client.
4. Open https://launch.expo.dev/ from Safari and supply that repository's URL. Follow Expo's interactive instructions to link your Expo account, Apple Developer team, generate signing credentials, build the iOS app, and submit to TestFlight.
5. In App Store Connect > TestFlight, add yourself as an internal tester. Install TestFlight from the iPhone App Store and accept the invitation once the build has processed.

**Important:** Launch and EAS require their own authentication, and Apple may request two-factor confirmation. Never paste passwords, Expo personal access tokens, certificates or Apple signing credentials into this chat. Confirm the app's bundle identifier is available to your Apple team: `com.ibrolee.gamevault`.

## Alternative: using any Windows / Mac / Linux computer

Extract the archive. Run in the folder containing `package.json`:

```bash
npm install
npm run preflight
npx testflight
```

`npx testflight` is Expo's guided one-command iOS build, signing, and TestFlight submission flow. EAS does the iOS compilation in its cloud; you do **not** need a Mac to run the command.

## Current validation

- Backup and Safari migration data tests passed.
- iOS/TestFlight config checks passed.
- Source-level syntax checked, but complete type checking and native EAS compilation are **not** certified.
- npm dependency installation couldn't be completed in this environment because npm registry DNS lookup failed (`EAI_AGAIN`).
- No signed IPA, EAS project link, or TestFlight invitation exists yet.

## Notes

The Expo EAS project ID is deliberately not hard-coded: the guided flow creates/links this project under your Expo account. The app uses on-device SQLite without Supabase, Firebase or mandatory login. Backup/export is manually initiated by you.