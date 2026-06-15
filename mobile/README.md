# CollabCity Mobile App

React Native (Expo) app for CollabCity — works on both Android and iOS.

## Prerequisites

- Node.js v18+
- Expo CLI: `npm install -g expo-cli`
- For Android: Android Studio or physical device
- For iOS: Xcode (Mac only) or physical iPhone

## Setup

### 1. Install dependencies
```bash
cd mobile
npm install
```

### 2. Configure API URL
Open `src/lib/theme.js` and replace:
```js
export const API_URL = 'https://your-railway-url.up.railway.app/api';
export const SOCKET_URL = 'https://your-railway-url.up.railway.app';
```
With your actual Railway backend URL.

### 3. Run the app
```bash
# Start Expo development server
npm start

# Run on Android
npm run android

# Run on iOS (Mac only)
npm run ios
```

### 4. Test on your phone
1. Install **Expo Go** app from Play Store / App Store
2. Scan the QR code shown in terminal
3. App loads on your phone instantly

## Building for Production

### Android APK
```bash
npm run build:android
```

### iOS IPA
```bash
npm run build:ios
```

Requires EAS account at expo.dev

## Features
- Auth (login, register with vibe tags)
- Discover people with filters
- Real-time chat with file sharing
- Projects board with apply/post
- Milestones tracking
- AI Smart Match
- City Leaderboard
- Notifications
- Profile with photo upload
- Settings with payment requests
- Sign out
