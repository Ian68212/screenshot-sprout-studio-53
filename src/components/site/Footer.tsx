import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import logoNavy from "@/assets/rodrinox-logo-navy.png.asset.json";
import { company, nav, services } from "@/content/site";
import { whatsappUrl } from "@/lib/whatsapp";
import { btn } from "./primitives";
import { cn } from "@/lib/utils";

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
  return (
    <footer className="bg-navy-deep text-navy-foreground/75">
      <div className="container-site grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <img src={logoNavy.url} alt="Rodrinox Pro" className="h-16 w-auto" width={270} height={84} loading="lazy" />
          <p className="mt-5 text-sm leading-relaxed">Mais do que soluções. Parcerias que geram resultados.</p>
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
            {services.map((s) => <li key={s.slug}><Link to="/servicos" hash={s.slug} className="hover:text-accent">{s.title}</Link></li>)}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-navy-foreground">Atendimento</h3>
          <ul className="mt-5 space-y-2.5 text-sm">
            <li><a href={`mailto:${company.email}`} className="hover:text-accent">{company.email}</a></li>
            <li><a href={company.phoneHref} className="hover:text-accent">{company.phone}</a></li>
            <li><a href={whatsappUrl(company.whatsappNumber)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-accent"><MessageCircle className="h-4 w-4" />WhatsApp: {company.whatsapp}</a></li>
            <li>{company.address}</li>
            <li>{company.site}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-navy-foreground/10">
        <div className="container-site flex flex-col justify-between gap-2 py-6 text-xs md:flex-row">
          <span>© {new Date().getFullYear()} Rodrinox Pro. Todos os direitos reservados.</span>
          <span>{company.slogan}</span>
        </div>
      </div>
    </footer>
  );
}

export function WhatsAppFab() {
  return (
    <a
      href={whatsappUrl(company.whatsappNumber, "Olá, Rodrinox Pro! Gostaria de mais informações.")}
      target="_blank"
      rel="noreferrer"
      aria-label="Conversar pelo WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-accent-foreground shadow-card transition-transform hover:scale-110"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
