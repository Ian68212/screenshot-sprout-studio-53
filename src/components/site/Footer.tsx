import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, Instagram, ArrowUpRight, X } from "lucide-react";
import logoOficial from "@/assets/rodrinox-oficial.png";
import { company, nav, services } from "@/content/site";
import { whatsappUrl } from "@/lib/whatsapp";
import { btn } from "./primitives";
import { cn } from "@/lib/utils";
import { usePublicSite } from "@/lib/site-cms";

export function CtaBand() {
  return (
    <section className="bg-accent">
      <div className="container-site flex flex-col items-start justify-between gap-6 py-14 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-bold text-accent-foreground md:text-4xl">Vamos tirar seu projeto do papel?</h2>
          <p className="mt-2 text-accent-foreground/85">Fale com a nossa equipe e receba uma proposta clara para a sua necessidade.</p>
        </div>
        <Link to="/orcamento" className={cn(btn.base, btn.navy)}>Solicitar orçamento</Link>
      </div>
    </section>
  );
}

export function Footer() {
  const cms = usePublicSite();
  const identity = cms.content("site.identidade", {});
  const contact = cms.content("contato.dados", {});
  const email = String(contact.email ?? company.email);
  const phone = String(contact.telefone ?? company.phone);
  const phoneHref = String(contact.telefone_link ?? company.phoneHref);
  const whatsapp = String(contact.whatsapp ?? company.whatsapp);
  const whatsappNumber = String(contact.whatsapp_numero ?? company.whatsappNumber);
  const address = String(contact.endereco ?? company.address);
  const slogan = String(identity.slogan ?? company.slogan);
  const footerText = String(identity.texto_rodape ?? "Mais do que soluções. Parcerias que geram resultados.");
  const logoUrl = String(identity.logo_url ?? "");
  const [logoFalhou, setLogoFalhou] = useState(false);
  const srcLogo = logoUrl && !logoFalhou ? logoUrl : logoOficial;
  const serviceItems = cms.items("servico");
  const footerServices = serviceItems.length ? serviceItems.map(s=>({slug:s.slug,title:s.titulo})) : services;
  return (
    <footer className="bg-navy-deep text-navy-foreground/75">
      <div className="container-site grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="inline-flex max-w-full items-center rounded-md bg-white px-3 py-2"><img src={srcLogo} onError={() => setLogoFalhou(true)} alt="Rodrinox Pro — Soluções, Inovação e Resultados" className="h-auto max-h-20 w-auto max-w-full object-contain" width={270} height={90} loading="lazy" /></div>
          <p className="mt-5 text-sm leading-relaxed">{footerText}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-navy-foreground">Navegação</h3>
          <ul className="mt-5 space-y-2.5 text-sm">
            {nav.map((n) => <li key={n.to}>{ "external" in n && n.external ? <a href={n.to} className="hover:text-accent">{n.label}</a> : <Link to={n.to} className="hover:text-accent">{n.label}</Link> }</li>)}
            <li><Link to="/orcamento" className="hover:text-accent">Solicitar orçamento</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-navy-foreground">Serviços</h3>
          <ul className="mt-5 space-y-2.5 text-sm">
            {footerServices.map((s) => <li key={s.slug}><Link to="/servicos" hash={s.slug} className="hover:text-accent">{s.title}</Link></li>)}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-navy-foreground">Atendimento</h3>
          <ul className="mt-5 space-y-2.5 text-sm">
            <li><a href={`mailto:${email}`} className="hover:text-accent">{email}</a></li>
            <li><a href={phoneHref} className="hover:text-accent">{phone}</a></li>
            <li><a href={whatsappUrl(whatsappNumber)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-accent"><MessageCircle className="h-4 w-4" />WhatsApp: {whatsapp}</a></li>
            <li>{address}</li>
            <li>{String(identity.site ?? company.site)}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-navy-foreground/10">
        <div className="container-site flex flex-col justify-between gap-2 py-6 text-xs md:flex-row">
          <span>© {new Date().getFullYear()} Rodrinox Pro. Todos os direitos reservados.</span>
          <span>{slogan}</span>
        </div>
      </div>
    </footer>
  );
}

export function WhatsAppFab() {
  const cms = usePublicSite();
  const contact = cms.content("contato.dados", {});
  return (
    <a
      href={whatsappUrl(String(contact.whatsapp_numero ?? company.whatsappNumber), "Olá, Rodrinox Pro! Gostaria de mais informações.")}
      target="_blank"
      rel="noreferrer"
      aria-label="Conversar pelo WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-accent-foreground shadow-card transition-transform hover:scale-110"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}

export function InstagramFab() {
  const cms = usePublicSite();
  const identity = cms.content("site.identidade", {});
  const contact = cms.content("contato.dados", {});
  const configured = String(identity.instagram_url ?? contact.instagram_url ?? "").trim();
  const url = /^https:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._/-]+\/?(?:\?.*)?$/.test(configured)
    ? configured : "https://www.instagram.com/rodrinoxpro/";
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem("rp-instagram-invite-dismissed")) { setDismissed(true); return; }
    } catch {}
    const timer = window.setTimeout(() => setOpen(true), 5500);
    return () => window.clearTimeout(timer);
  }, []);
  function close() {
    setOpen(false);
    setDismissed(true);
    try { sessionStorage.setItem("rp-instagram-invite-dismissed", "1"); } catch {}
  }
  return (
    <div className="fixed bottom-24 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-24" aria-label="Instagram da Rodrinox Pro">
      {open && !dismissed && (
        <div className="relative w-[min(340px,calc(100vw-40px))] rounded-xl border border-white/15 bg-[#102d49] p-4 text-white shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-300">
          <button type="button" onClick={close} aria-label="Fechar convite para o Instagram" className="absolute right-2 top-2 rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
          <div className="flex items-start gap-3 pr-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#C13584]"><Instagram className="h-6 w-6" /></span>
            <div><strong className="text-sm">Acompanhe a Rodrinox Pro</strong><p className="mt-1 text-xs leading-relaxed text-white/75">Projetos, tecnologia e bastidores da nossa produção.</p></div>
          </div>
          <a href={url} target="_blank" rel="noopener noreferrer" onClick={close} className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-[#f58a24] px-4 py-3 text-sm font-semibold text-[#102d49] transition-colors hover:bg-[#ffad53]">
            Conheça nosso Instagram <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      )}
      <button type="button" onClick={() => { setDismissed(false); setOpen(v => !v); }} aria-label={open ? "Fechar convite do Instagram" : "Conheça nosso Instagram"} aria-expanded={open && !dismissed} className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-[#f58a24] text-[#102d49] shadow-xl transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f58a24]">
        <Instagram className="h-7 w-7" />
      </button>
    </div>
  );
}
