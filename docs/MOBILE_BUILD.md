# Mobile App Build Guide

This guide explains how to build the Android and iOS versions of BOOTMARK using Capacitor.

## Prerequisites

1.  **Dependencies Installed:**
    ```bash
    cd public
    npm install
    ```
2.  **Environment Setup:**
    - **Android:** Install [Android Studio](https://developer.android.com/studio).
    - **iOS:** Install Xcode (Mac only).

## 🤖 Building for Android

1.  **Build the Web Assets:**
    First, we need to build the React app.
    ```bash
    cd public
    npm run build
    ```

2.  **Sync with Native Project:**
    Copy the web assets to the Android project.
    ```bash
    npx cap sync
    ```

3.  **Open in Android Studio:**
    ```bash
    npx cap open android
    ```

4.  **Generate APK:**
    - In Android Studio, go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
    - Locate the APK in `android/app/build/outputs/apk/debug/`.

## 🍎 Building for iOS (Mac Only)

1.  **Build Web Assets:**
    ```bash
    cd public
    npm run build
    ```

2.  **Sync:**
    ```bash
    npx cap sync
    ```

3.  **Open in Xcode:**
    ```bash
    npx cap open ios
    ```

4.  **Archive & Publish:**
    - Select your target device (Any iOS Device).
    - Go to **Product > Archive**.
    - Follow the prompts to upload to TestFlight or App Store.

## 🔄 Live Reload (Development)

To test on a device without rebuilding every time:

1.  Find your computer's IP address (e.g., `192.168.1.5`).
2.  Edit `public/capacitor.config.json`:
    ```json
    {
      "server": {
        "url": "http://192.168.1.5:3000",
        "cleartext": true
      }
    }
    ```
3.  Run `npx cap sync`.
4.  Run the app on your device.
5.  Start the dev server: `npm run dev -- --host`.

> **Note:** Don't forget to remove the `server` config before building for production!
