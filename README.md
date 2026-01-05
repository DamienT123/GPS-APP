Route planner App


==========================================
QUICK GUIDE FOR DRIES: 
==========================================


RUN
   npx expo start --clear --tunnel
   a

   ONLY RUNS ON CONNECTED ANDROID DEVICE (NO EMULATOR OR WEB)


==========================================
==========================================


How to run the app (Android device only)
Requirements

Node.js installed

Android phone with USB debugging enabled

Expo Go or a development build installed on the phone

USB cable

1. Install dependencies
npm install

2. Start the app on a real Android device

This app must run on a real Android device.

Do NOT use:

Web (expo start --web)

Android emulator

Reason (important):

The app uses SQLite (native)

The app uses MapLibre React Native (native map)

These features do not work on Web and are unstable on emulators

Option A – Run with Expo Dev Client (recommended)

Build the app once:

npx expo run:android


Then start the project:

npx expo start --dev-client


Connect your Android phone with USB and the app will open automatically.

Option B – Run with Expo Go
npx expo start --clear --tunnel