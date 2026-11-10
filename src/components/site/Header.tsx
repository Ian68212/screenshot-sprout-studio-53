
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Menu, Phone, X } from "lucide-react";
import logo from "@/assets/rodrinox-oficial.png";
import { company, nav } from "@/content/site";
import { btn } from "./primitives";
import { cn } from "@/lib/utils";
import { usePublicSite } from "@/lib/site-cms";

export function Header() {
  const cms = usePublicSite();
  const identity = cms.content("site.identidade", {});
  const contact = cms.content("contato.dados", {});
  const tagline = String(identity.tagline ?? company.tagline);
  const logoUrl = String(identity.logo_url ?? "");
  const email = String(contact.email ?? company.email);
  const phone = String(contact.telefone ?? company.phone);
  const phoneHref = String(contact.telefone_link ?? company.phoneHref);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={cn(
          "bg-navy-deep text-navy-foreground/80 transition-all duration-300",
          scrolled ? "h-0 overflow-hidden" : "h-9"
        )}
      >
        <div className="container-site flex h-9 items-center justify-between text-xs">
          <span className="hidden sm:block">{tagline}</span>
          <div className="flex items-center gap-5">
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-1.5 hover:text-accent"
            >
              <Mail className="h-3.5 w-3.5" />
              {email}
            </a>
            <a
              href={phoneHref}
              className="hidden items-center gap-1.5 hover:text-accent md:flex"
            >
              <Phone className="h-3.5 w-3.5" />
              {phone}
            </a>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "border-b bg-card/95 backdrop-blur transition-shadow",
          scrolled && "shadow-card"
        )}
      >
        <div className="site-header-inner container-site flex h-20 items-center gap-6">
          <Link to="/" aria-label="Rodrinox Pro — início" className="site-header-brand shrink-0">
            <img
              src={logoUrl || logo}
              alt="Rodrinox Pro"
              className="h-14 w-auto"
              width={1920}
              height={640}
            />
          </Link>

          {/* MENU DESKTOP */}
          <nav
            className="site-header-nav items-center"
            aria-label="Menu principal"
          >
            {nav.map((n) =>
              "external" in n && n.external ? (
                <a
                  key={n.to}
                  href={n.to}
                  className="site-header-link relative py-2 text-sm font-medium text-primary/80 transition-colors hover:text-primary"
                >
                  {n.label}
                </a>
              ) : (
                <Link
                  key={n.to}
                  to={n.to}
                  activeOptions={{ exact: n.to === "/" }}
                  className="site-header-link relative py-2 text-sm font-medium text-primary/80 transition-colors hover:text-primary after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-accent after:transition-all hover:after:w-full data-[status=active]:text-primary data-[status=active]:after:w-full"
                >
                  {n.label}
                </Link>
              )
            )}
          </nav>

          <Link
            to="/orcamento"
            className={cn("site-header-cta", btn.base, btn.accent)}
          >
            Solicitar orçamento
          </Link>

          <button
            className="site-header-toggle text-primary"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
          </button>
        </div>

        {/* MENU MOBILE */}
        {open && (
          <nav
            className="site-header-mobile-nav border-t bg-card"
            aria-label="Menu móvel"
          >
            <div className="container-site flex flex-col py-4">
              {nav.map((n) =>
                "external" in n && n.external ? (
                  <a
                    key={n.to}
                    href={n.to}
                    onClick={() => setOpen(false)}
                    className="border-b py-3 font-medium text-primary last:border-0"
                  >
                    {n.label}
                  </a>
                ) : (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className="border-b py-3 font-medium text-primary last:border-0"
                  >
                    {n.label}
                  </Link>
                )
              )}

              <Link
                to="/orcamento"
                onClick={() => setOpen(false)}
                className={cn("site-header-mobile-cta", btn.base, btn.accent, "mt-4")}
              >
                Solicitar orçamento
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
