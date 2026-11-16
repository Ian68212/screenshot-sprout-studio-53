#!/usr/bin/env python3
from pathlib import Path

root = Path(__file__).resolve().parents[1]
gradle = (root / "app/build.gradle").read_text(encoding="utf-8")
manifest = (root / "app/src/main/AndroidManifest.xml").read_text(encoding="utf-8")
activity = (root / "app/src/main/java/br/com/rodrinoxpro/portal/MainActivity.java").read_text(encoding="utf-8")
service = (root / "app/src/main/java/br/com/rodrinoxpro/portal/RodrinoxMessagingService.java").read_text(encoding="utf-8")
config = (root / "app/google-services.json").read_text(encoding="utf-8")

checks = {
    "version incremented for isolated test": 'versionCode 29' in gradle and 'versionName "1.0.29"' in gradle,
    "Firebase Messaging dependency": 'com.google.firebase:firebase-messaging' in gradle,
    "official package retained": '"package_name": "br.com.rodrinoxpro.portal"' in config,
    "notification permission declared": 'android.permission.POST_NOTIFICATIONS' in manifest,
    "Firebase service registered": '.RodrinoxMessagingService' in manifest and 'com.google.firebase.MESSAGING_EVENT' in manifest,
    "FCM token retrieved": 'FirebaseMessaging.getInstance().getToken()' in activity,
    "token sent through authenticated WebView session": '/colaborador/api/push/registrar' in activity and "credentials:'include'" in activity,
    "token refresh persisted": 'onNewToken' in service,
    "data messages displayed": 'onMessageReceived' in service,
}

# The portal supplies the official WebView layout. FCM must never modify it.
import subprocess
changed_portal = subprocess.run(
    ["git", "diff", "--name-only", "android-v1.0.28", "HEAD", "--", "portal/public"],
    check=True, capture_output=True, text=True
).stdout.strip()
checks["portal public files unchanged from official 1.0.28"] = not changed_portal

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(("PASS: " if ok else "FAIL: ") + name)
if failed:
    raise SystemExit(1)
