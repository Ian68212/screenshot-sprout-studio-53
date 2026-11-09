(() => {
  const ua = navigator.userAgent || "";
  const isNativeAndroid = /RodrinoxAndroid\/1\.0/i.test(ua);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const isInstalledApp = isNativeAndroid || isStandalone;
  document.body.dataset.view = isInstalledApp ? "app" : "browser";

  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (!isInstalledApp && window.matchMedia("(max-width: 900px)").matches) {
    if (isAndroid) document.body.dataset.installPlatform = "android";
    else if (isIOS) document.body.dataset.installPlatform = "ios";
  }
})();