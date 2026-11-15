#!/usr/bin/env python3
"""Fail CI if public APK links or the build workflow regress to unapproved releases."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
approved = "https://github.com/Ian68212/screenshot-sprout-studio-53/releases/download/android-v1.0.28/Rodrinox-Pro-Android.apk"
pages = ("portal/public/index.html", "src/routes/aplicativo.tsx")
for name in pages:
    text = (root / name).read_text(encoding="utf-8")
    links = re.findall(r'https://github\.com/Ian68212/screenshot-sprout-studio-53/releases/[^"\s<>]+', text)
    if links != [approved]:
        raise SystemExit(f"FAIL {name}: expected exactly the approved APK URL, got {links!r}")
    if "Versão disponível para download: v1.0.28" not in text:
        raise SystemExit(f"FAIL {name}: approved version not displayed to user")
    if name == "portal/public/index.html" and "Baixar app v1.0.28" not in text:
        raise SystemExit("FAIL portal: button must display APK version")
    if name == "src/routes/aplicativo.tsx" and "Baixar Android v1.0.28" not in text:
        raise SystemExit("FAIL site: button must display APK version")
    if "v1.0.5-TESTE" in text or "Versão 1.0.5 TESTE" in text:
        raise SystemExit(f"FAIL {name}: unapproved test version still advertised")

workflow = (root / ".github/workflows/build-android-apk.yml").read_text(encoding="utf-8")
if "softprops/action-gh-release" in workflow or "make_latest:" in workflow or "contents: write" in workflow:
    raise SystemExit("FAIL: automatic public APK release was re-enabled")
print("PASS: public APK download links pinned to approved v1.0.28; auto-release disabled")
