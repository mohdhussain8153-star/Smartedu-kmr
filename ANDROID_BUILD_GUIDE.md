# SmartEduKMR: Android APK Build Guide

Follow these steps to convert this project into a fully functional Android APK.

## 1. Prepare the Android Project
1. Open **Android Studio** and create a **New Project**.
2. Select **Empty Views Activity**.
3. Name it `SmartEduKMR` and package it as `com.smartedukmr.app`.
4. Select **Kotlin** or **Java** (Guide below uses Kotlin).

## 2. Setup Web Assets
1. In your Android Studio project, navigate to: `app/src/main/`.
2. Right-click `main` -> `New` -> `Directory` -> name it `assets`.
3. **Copy all files** from this web project (`index.html`, `index.tsx`, `App.tsx`, etc.) into that `assets/` folder.
   * *Note: Ensure your build tool (like Vite or Webpack) has bundled your code into a single index.js if you are using a standard React build, or just copy the source files if using the ESM import maps provided.*

## 3. Configure Android Files
1. **AndroidManifest.xml**: Replace the content of `app/src/main/AndroidManifest.xml` with the provided file.
2. **MainActivity.kt**: Replace the content of `app/src/main/java/com/smartedukmr/app/MainActivity.kt` with the provided file.
3. **Styles**: In `res/values/themes.xml`, ensure you use a `NoActionBar` theme to get a full-screen experience.

## 4. Enable Hardware Support
Ensure `android:hardwareAccelerated="true"` is set in the `<application>` tag of your Manifest to allow the fluid animations and fireworks to run smoothly at 60fps.

## 5. Build and Sign APK
1. Go to **Build** -> **Generate Signed Bundle / APK**.
2. Select **APK**.
3. Create a new KeyStore (if you don't have one).
4. Select **release** build variant.
5. Check **V1** and **V2** signature versions.
6. Click **Finish**. Your APK will be located in `app/release/`.

## 6. Offline Functionality
The app uses **IndexedDB** (`db.ts`) and a **Service Worker** (`sw.js`). When running in the Android WebView, these technologies will cache the MCQ bank locally, allowing aspirants to practice even without an internet connection once the initial content is loaded.