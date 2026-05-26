# Android release signing (GitHub Actions)

This file explains how to create an Android keystore and configure GitHub Actions to produce a production-signed APK.

1) Generate a release keystore locally (example):

```bash
keytool -genkeypair -v \
  -keystore my-release-key.keystore \
  -alias mykeyalias \
  -keyalg RSA -keysize 2048 -validity 10000
```

2) Encode the keystore as base64 and copy the string (Linux/macOS):

```bash
base64 -w0 my-release-key.keystore > keystore.base64
cat keystore.base64
```

3) In your GitHub repository settings -> Secrets -> Actions, add these secrets:

- `ANDROID_KEYSTORE_BASE64` — the base64 content from step 2
- `ANDROID_KEYSTORE_PASSWORD` — the keystore password
- `ANDROID_KEY_ALIAS` — the alias used when creating the keystore (e.g. `mykeyalias`)
- `ANDROID_KEY_PASSWORD` — the key password (often same as keystore password)

4) Trigger the workflow `Build Android Release APK` in Actions or push to `main`.

## Real Terminal Features (Maya Manager)
- **T0 Instant Settlement**: Terminals configured with T0 support process Maya payments with immediate settlement.
- **Dynamic QR Display**: Real-time QR generation for customer-facing terminal scanning.
- **Auto-polling**: The app automatically detects payment completion for T0 transactions.

Notes
- The workflow expects the mobile project at `mobile_native/` or `mobile/`. Adjust if you use a different path.
- The workflow will upload the produced `app-release.apk` as an artifact in the workflow run.
- Do NOT commit your keystore to the repository.
