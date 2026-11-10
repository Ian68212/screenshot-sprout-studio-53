import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import logoNavy from "@/assets/rodrinox-logo-navy.png.asset.json";
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
  const serviceItems = cms.items("servico");
  const footerServices = serviceItems.length ? serviceItems.map(s=>({slug:s.slug,title:s.titulo})) : services;
  return (
    <footer className="bg-navy-deep text-navy-foreground/75">
      <div className="container-site grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <img src={logoUrl || logoNavy.url} alt="Rodrinox Pro" className="h-16 w-auto" width={270} height={84} loading="lazy" />
          <p className="mt-5 text-sm leading-relaxed">{footerText}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-navy-foreground">Navegação</h3>
          <ul className="mt-5 space-y-2.5 text-sm">
            {nav.map((n) => <li key={n.to}><Link to={n.to} className="hover:text-accent">{n.label}</Link></li>)}
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
