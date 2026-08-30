# Android APK Generation Spec

This document details the architecture for the white-label Android APK builder, asset replacement, and compilation wrapper structure.

## 1. White-Label Wrapper Architecture

To deploy an Android application for each tenant without maintaining separate code repositories, SiBangku utilizes a unified web wrapper architecture (Cordova, Capacitor, or a custom Android WebView wrapper).

```text
               +----------------------------------+
               | Gradle / WebView Wrapper Template|
               +----------------+-----------------+
                                |
             +------------------+------------------+
             |                                     |
   +---------v-----------+               +---------v-----------+
   | APK - Tenant A      |               | APK - Tenant B      |
   | (com.sibangku.a)    |               | (com.sibangku.b)    |
   | Points to:          |               | Points to:          |
   | tenant-a.sibangku   |               | tenant-b.sibangku   |
   +---------------------+               +---------------------+
```

*   **Host Resolution**: The Android application is a thin native client containing a full-screen WebView.
*   **Dynamic Endpoint Injection**: During build compilation, the Gradle configuration injects the tenant's web domain URL (e.g. `distroavenue.sibangku.app`) as the default entry point URL in the WebView.
*   **Tenant Separation**: Each compiled APK uses its specific `packageId` (e.g., `com.sibangku.distroavenue`) generated using `generatePackageId()`.

## 2. Branding & Asset Replacement

Prior to triggering the Gradle builder, the build script replaces the native assets:

1.  **Application Launcher Icon**: Replaces `/res/mipmap-*/ic_launcher.png` with the tenant's brand logo.
2.  **App Color Theme**: Replaces variables in the native XML themes (`/res/values/colors.xml`) with the tenant's primary and secondary brand hex colors:
    *   `colorPrimary`
    *   `colorPrimaryDark`
3.  **App Name**: Overwrites the app title string in `/res/values/strings.xml` with the tenant's custom restaurant name.

## 3. Automated Builder Execution (CLI/Worker)

The build pipeline runs automatically when triggered by the control plane:

```bash
# 1. Fetch tenant configurations
sibangku tenant inspect TEN-2026-XXXXXX

# 2. Inject parameters and assets
node scripts/generate-apk-assets.js --tenant-id TEN-2026-XXXXXX

# 3. Compile the release package
cd platforms/android && ./gradlew assembleRelease
```

The resulting signed APK is uploaded to the tenant's storage bucket (`storageIdentifier`) for administrative download.
