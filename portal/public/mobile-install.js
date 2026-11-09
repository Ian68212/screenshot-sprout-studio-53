(() => {
  const ua = navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (window.matchMedia("(max-width: 767px)").matches) {
    if (isAndroid) document.body.dataset.installPlatform = "android";
    else if (isIOS) document.body.dataset.installPlatform = "ios";
  }
})();