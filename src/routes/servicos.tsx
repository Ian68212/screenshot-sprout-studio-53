import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { images, services } from "@/content/site";
import { PageHero, Reveal, btn } from "@/components/site/primitives";
import { CtaBand } from "@/components/site/Footer";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { useSiteCms } from "@/lib/site-cms";

export const Route = createFileRoute("/servicos")({
  head: () => ({ meta: pageMeta("Serviços e soluções industriais", "Corte a laser, dobra de chapas, soldagem a laser, TIG e especiais, cilindros, projetos personalizados e componentes metálicos.") }),
  component: Servicos,
});

function Servicos() {
  const cms = useSiteCms();
  const published = cms.itens.filter((item) => item.tipo === "servico");
  const displayServices = published.length ? published.map((item, n) => ({
    slug: item.slug, title: item.titulo, short: item.resumo || "",
    description: item.descricao || "", image: cms.imagem(item.imagem_id) || services[n % services.length]!.image,
  })) : services;
  return (
    <>
      <PageHero eyebrow="Serviços e soluções" title="Soluções completas em processamento de metais." text="A disponibilidade e o escopo de cada serviço são confirmados com nossa equipe." image={images.soldaLaser} />
      <section className="py-20 md:py-28">
        <div className="container-site space-y-20 md:space-y-28">
          {displayServices.map((s, n) => (
            <article key={s.slug} id={s.slug} className="grid scroll-mt-32 items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <Reveal className={cn(n % 2 === 1 && "lg:order-2")}>
                <img src={s.image} alt={s.title} className="aspect-[4/3] w-full object-cover shadow-card" loading="lazy" width={1280} height={960} />
              </Reveal>
              <Reveal delay={120}>
                <span className="font-display text-sm font-bold text-accent">{String(n + 1).padStart(2, "0")} / {String(services.length).padStart(2, "0")}</span>
                <h2 className="mt-3 text-3xl font-bold text-primary md:text-4xl">{s.title}</h2>
                <div className="mt-5 h-0.5 w-14 bg-accent" />
                <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{s.description}</p>
                <Link to="/orcamento" search={{ servico: s.title }} className={cn(btn.base, btn.accent, "mt-8")}>Solicitar orçamento <ArrowRight className="h-4 w-4" /></Link>
              </Reveal>
            </article>
          ))}
        </div>
      </section>
      <CtaBand />
    </>
  );
}
