(() => {
  // Script de personalização candidato. Não está integrado ao aplicativo.
  // O placeholder da logo precisa ser substituído por um recurso validado.
  if (!document.getElementById('f')) return;
  if (document.getElementById('rod-app-native-style')) return;

  const appLogo = "__RODRINOX_APP_LOGO_DATA__";
  const logoSelector = '#login-logo, .brand-full-logo, .brand-lockup img, .brand-logo img, .brand-lockup .brand-full-logo, img[data-brand-logo], img[alt*="Logotipo Rodrinox"]';
  const applyAppLogo = () => {
    if (!appLogo || !appLogo.startsWith('data:image/')) return;
    document.querySelectorAll(logoSelector).forEach(image => {
      if (image instanceof HTMLImageElement) {
        if (image.getAttribute('src') !== appLogo) image.setAttribute('src', appLogo);
        image.hidden = false;
        image.removeAttribute('srcset');
      }
    });
  };
  applyAppLogo();
  const logoObserver = new MutationObserver(() => applyAppLogo());
  logoObserver.observe(document.documentElement, {
    childList: true, subtree: true, attributes: true,
    attributeFilter: ['src', 'srcset']
  });
  const style = document.createElement('style');
  style.id = 'rod-app-native-style';
  style.textContent = `
    html, body { width:100% !important; height:100% !important; min-height:100% !important; margin:0 !important; overflow:hidden !important; background:#03152d !important; }
    body[data-view="app"] { display:block !important; align-items:initial !important; justify-content:initial !important; }
    body[data-view="app"] .browser-shell {
      position:fixed !important; inset:0 !important; display:block !important;
      width:100vw !important; height:100dvh !important; min-height:0 !important;
      max-height:none !important; max-width:none !important; aspect-ratio:auto !important;
      overflow:hidden !important; background:#03152d !important; background-image:none !important;
    }
    body[data-view="app"] .browser-shell::before {
      content:""; position:absolute; z-index:0; left:-2%; right:-2%; bottom:-2%;
      height:43%; background-image:var(--rod-factory-image, none);
      background-size:cover; background-position:center 52%; background-repeat:no-repeat;
      filter:blur(3px) brightness(.58) saturate(1.08); transform:scale(1.045);
    }
    body[data-view="app"] .browser-shell::after {
      content:""; position:absolute; z-index:0; inset:0;
      background:linear-gradient(180deg,#03152d 0%,rgba(3,21,45,.99) 43%,rgba(3,21,45,.88) 60%,rgba(3,21,45,.12) 100%);
      pointer-events:none;
    }
    body[data-view="app"] .hero-panel, body[data-view="app"] .welcome,
    body[data-view="app"] .back-link, body[data-view="app"] .benefits,
    body[data-view="app"] .footer, body[data-view="app"] .mobile-install { display:none !important; }
    body[data-view="app"] .login-panel {
      position:absolute !important; z-index:2 !important; inset:0 !important;
      display:flex !important; flex-direction:column !important; align-items:stretch !important;
      justify-content:flex-start !important; width:100% !important; height:100% !important;
      min-height:0 !important; padding:calc(env(safe-area-inset-top) + 4.5vh) 9.2vw calc(env(safe-area-inset-bottom) + 3vh) !important;
      margin:0 !important; overflow:hidden !important; background:transparent !important;
    }
    body[data-view="app"] .brand-lockup {
      display:flex !important; flex:0 0 auto !important; justify-content:center !important;
      align-items:center !important; width:100% !important; height:23vh !important;
      min-height:150px !important; max-height:260px !important; margin:0 0 2.8vh !important;
    }
    body[data-view="app"] .brand-lockup .brand-mark,
    body[data-view="app"] .brand-lockup .brand-copy { display:none !important; }
    body[data-view="app"] .brand-lockup img,
    body[data-view="app"] .brand-lockup .brand-full-logo {
      display:block !important; visibility:visible !important;
      flex:0 1 auto !important; width:100% !important; height:100% !important;
      min-width:0 !important; min-height:0 !important; max-width:100% !important;
      max-height:100% !important; aspect-ratio:480 / 398 !important;
      object-fit:contain !important; object-position:center center !important;
      image-rendering:auto !important; -webkit-transform:translateZ(0);
      filter:drop-shadow(0 5px 14px rgba(0,0,0,.2));
    }
    body[data-view="app"] .login-form {
      position:relative !important; inset:auto !important; display:grid !important;
      grid-template-columns:1fr !important; gap:14px !important; width:100% !important;
      margin:0 !important; padding:0 !important;
    }
    body[data-view="app"] .field {
      position:relative !important; inset:auto !important; display:block !important;
      width:100% !important; height:58px !important; margin:0 !important;
    }
    body[data-view="app"] .field input {
      position:absolute !important; inset:0 !important; width:100% !important; height:58px !important;
      padding:0 52px 0 54px !important; border:1px solid rgba(0,157,216,.82) !important;
      border-radius:19px !important; background:rgba(3,43,75,.86) !important;
      color:#fff !important; font:500 15px/1.2 Inter,"Segoe UI",Arial,sans-serif !important;
      box-shadow:inset 0 1px 10px rgba(0,0,0,.15),0 5px 18px rgba(0,0,0,.12) !important;
    }
    body[data-view="app"] .field input::placeholder { color:rgba(255,255,255,.68) !important; opacity:1 !important; }
    body[data-view="app"] .field input:focus { border-color:#35c4ff !important; background:rgba(4,52,87,.96) !important; }
    body[data-view="app"] .field-icon {
      display:block !important; left:17px !important; width:23px !important; height:23px !important;
      stroke:#f5fbff !important; z-index:2 !important;
    }
    body[data-view="app"] #toggle-password {
      position:absolute !important; z-index:3 !important; top:72px !important;
      right:7px !important; left:auto !important; width:44px !important; height:44px !important;
      padding:10px !important; margin:0 !important; transform:none !important;
      color:#fff !important; background:transparent !important;
    }
    body[data-view="app"] #toggle-password svg { width:22px !important; height:22px !important; }
    body[data-view="app"] .erro {
      position:relative !important; inset:auto !important; width:100% !important;
      min-height:0 !important; margin:0 !important; color:#ffd2c8 !important;
      text-align:center !important; font-size:12px !important; text-shadow:0 1px 4px #001 !important;
    }
    body[data-view="app"] #submit {
      position:relative !important; inset:auto !important; display:flex !important;
      width:100% !important; height:58px !important; min-height:58px !important;
      margin:2px 0 0 !important; padding:0 20px !important; border:0 !important;
      border-radius:999px !important; background:linear-gradient(100deg,#ff7900,#f15b16) !important;
      color:#fff !important; font-size:18px !important; font-weight:800 !important;
      box-shadow:0 8px 22px rgba(242,91,15,.3) !important;
    }
    body[data-view="app"] #submit span {
      position:static !important; width:auto !important; height:auto !important;
      overflow:visible !important; clip:auto !important; color:#fff !important;
      font-size:18px !important;
    }
    body[data-view="app"] #submit svg { display:none !important; }
    body[data-view="app"] #submit:disabled { opacity:.75 !important; }
    body[data-view="app"] #forgot-password {
      position:relative !important; inset:auto !important; display:block !important;
      width:100% !important; height:42px !important; margin:0 !important; padding:8px !important;
      color:#fff !important; font-size:14px !important; text-decoration:none !important;
      text-shadow:0 1px 5px #001 !important;
    }
    @media (max-height:700px) {
      body[data-view="app"] .login-panel { padding-top:2.5vh !important; }
      body[data-view="app"] .brand-lockup { height:15vh !important; min-height:82px !important; margin-bottom:2.5vh !important; }
      body[data-view="app"] .field, body[data-view="app"] .field input { height:52px !important; }
      body[data-view="app"] #toggle-password { top:64px !important; }
      body[data-view="app"] .login-form { gap:10px !important; }
    }
  `;
  document.head.appendChild(style);

  fetch('/colaborador/api/public/site/', { credentials:'same-origin', cache:'no-store', headers:{'Accept':'application/json'} })
    .then(response => response.ok ? response.json() : null)
    .then(data => {
      const item = (data?.conteudos || []).find(entry => entry.chave === 'pagina.login');
      if (!item) return;
      let config = {};
      try { config = JSON.parse(item.corpo || '{}'); } catch (_) { return; }
      const version = encodeURIComponent(item.atualizado_em || Date.now());
      const photoId = Number(config.imagem_id);
      if (Number.isSafeInteger(photoId) && photoId > 0) {
        const photoUrl = '/colaborador/api/public/site/midias/' + photoId + '?v=' + version;
        const image = new Image();
        image.onload = () => document.documentElement.style.setProperty('--rod-factory-image', 'url("' + photoUrl + '")');
        image.src = photoUrl;
      }
    })
    .catch(error => console.warn('Imagens do aplicativo Rodrinox Pro:', error));
})();
