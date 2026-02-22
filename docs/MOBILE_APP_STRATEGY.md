# Mobile App Strategy & Requirements

This document outlines the requirements and strategic options for extending the BOOTMARK platform to Android and iOS.

## 📱 Technology Options

### Option 1: React Native (Recommended)
**Best for:** High-quality, "true native" feel, extensive native feature access (GPS, Background, Notifications).
- **Pros:** Reuses React knowledge; excellent performance; vast ecosystem.
- **Cons:** Separate codebase (though can share logic with web); requires more setup.
- **Verdict:** **Strongly Recommended** for a field service app that relies heavily on GPS and offline capabilities.

### Option 2: Capacitor / Ionic
**Best for:** Speed to market, reusing 90% of existing web code.
- **Pros:** Wraps existing React web app; extremely fast development; single codebase.
- **Cons:** Performance can feel "web-like"; debugging native issues can be trickier.
- **Verdict:** Good fallback if developer resources are very limited.

### Option 3: Native (Swift/Kotlin)
**Best for:** Maximum performance.
- **Pros:** Best possible integration.
- **Cons:** Two entirely separate codebases; expensive; slow development.
- **Verdict:** **Not Recommended** (Overkill).

---

## � Code Reuse Analysis: Can we use the existing website code?

### If you choose Capacitor (High Reuse):
- **Yes, reusing 95%+ of code.**
- You basically wrap your current React website in a native container.
- **What you keep:** All pages, components, CSS, and logic.
- **What changes:** You might need to adjust some layout for small screens and add plugins for camera/GPS.

### If you choose React Native (Medium Reuse):
- **No, you cannot use the UI code (HTML/CSS).**
- React Native uses `<View>` and `<Text>` instead of `<div>` and `<p>`.
- **What you keep (30-50%):** You can share state logic, Redux/Context, API calls, hooks, and utility functions.
- **What changes:** You must rebuild all Visual Components (UI) from scratch.

---

## �🛠 Prerequisites & Requirements

### 1. Developer Accounts (Required for Store Release)
- **Apple Developer Program:**
    - Cost: **$99/year**
    - Required to publish to App Store and use TestFlight.
    - Requires D-U-N-S number for business enrollment.
- **Google Play Console:**
    - Cost: **$25 (one-time fee)**
    - Required to publish to Google Play Store.

### 2. Hardware
- **Mac Computer** is **MANDATORY** to build and sign iOS apps (unless using a cloud build service like EAS Build).
- Android apps can be built on Windows, Mac, or Linux.

### 3. Backend readiness
- **API Availability:** The backend must be hosted on a public server (e.g., Render/Heroku) with SSL (HTTPS).
- **CORS:** Ensure Cross-Origin Resource Sharing is configured to accept requests from mobile app sources.

---

## 🚀 Key Mobile Features to Plan

1.  **Push Notifications**
    - **Tech:** Firebase Cloud Messaging (FCM).
    - **Use Case:** Notify technicians of new jobs, schedule changes, or urgent messages.

2.  **Offline Mode** (Critical for Field Service)
    - **Tech:** WatermelonDB or SQLite (React Native) / PouchDB (Capacitor).
    - **Use Case:** Access work orders and save data when in areas with poor signal. Sync when online.

3.  **GPS & Location**
    - **Tech:** `react-native-maps` / `react-native-geolocation`.
    - **Use Case:** Background location tracking for technicians; turn-by-turn navigation.

4.  **Camera Integration**
    - **Tech:** `react-native-vision-camera`.
    - **Use Case:** Photo attachments for work orders; scanner for barcodes/QR codes (inventory).

---

## 📅 Roadmap Recommendation

1.  **Phase 1: Proof of Concept (POC)**
    - Set up React Native project.
    - Implement Authentication (Login/Logout).
    - Read-only view of Work Orders.

2.  **Phase 2: Core Field Features**
    - Create/Edit Work Orders.
    - GPS Check-in/Check-out.
    - Photo uploads.

3.  **Phase 3: Advanced & Store Launch**
    - Offline support.
    - Push Notifications.
    - Beta testing (TestFlight/Play Console).
    - App Store submission.
