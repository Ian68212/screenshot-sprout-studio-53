#!/usr/bin/env python3
"""Guard the approved Android login layout against accidental regressions.

Run: python3 android-app/tests/check_approved_login.py
This is a source-level check, not a device/screenshot test.
"""
from pathlib import Path

html = Path("portal/public/index.html").read_text(encoding="utf-8")
expected = {
    "approved aspect ratio": 'aspect-ratio:824/1600;max-height:100dvh',
    "original password eye dimensions": 'body[data-view="app"] #toggle-password svg{width:100%;height:100%',
    "original input overlay": 'body[data-view="app"] .field{position:absolute;left:25.2%;width:65.8%;height:6.15%}',
    "approved background artwork": 'background-image:url("/colaborador/assets/login-original.jpeg")',
    "app-only styling": 'body[data-view="app"] .browser-shell',
}
for name, value in expected.items():
    if value not in html:
        raise SystemExit(f"FAIL: {name} was changed")
if '--app-viewport-height' in html:
    raise SystemExit("FAIL: experimental viewport override returned")
print("PASS: approved Android login source checks")
