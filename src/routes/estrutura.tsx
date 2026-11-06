import { createFileRoute } from "@tanstack/react-router";
import { images } from "@/content/site";
import { PageHero, Reveal, SectionTitle } from "@/components/site/primitives";
import { CtaBand } from "@/components/site/Footer";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/estrutura")({
  head: () => ({ meta: pageMeta("Estrutura e capacidade produtiva", "Conheça a estrutura produtiva da Rodrinox Pro para corte a laser, dobra, soldagem e fabricação de componentes metálicos.") }),
  component: Estrutura,
});

const areas = [
  { title: "Corte a laser", image: images.heroLaser },
  { title: "Dobra de chapas", image: images.dobra },
  { title: "Soldagem a laser", image: images.soldaLaser },
  { title: "Soldagem TIG", image: images.soldaTig },
];

function Estrutura() {
  return (
    <>
      <PageHero eyebrow="Estrutura" title="Capacidade produtiva para o seu projeto." image={images.fabrica} />
      <section className="py-24">
        <div className="container-site">
          <SectionTitle eyebrow="Nosso parque fabril" title="Processos integrados em um só lugar." text="Integramos corte, dobra e soldagem para atender da peça unitária a projetos completos." />
          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {areas.map((a, n) => (
              <Reveal key={a.title} delay={(n % 2) * 100} className="group overflow-hidden border bg-card">
                <div className="overflow-hidden"><img src={a.image} alt={a.title} className="aspect-[16/10] w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" width={1280} height={960} /></div>
                <div className="p-7">
                  <h3 className="text-xl font-bold text-primary">{a.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">[Equipamentos e capacidades técnicas — a preencher]</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-14 grid gap-px bg-border sm:grid-cols-3">
            {["Área fabril", "Equipamentos", "Equipe técnica"].map((t) => (
              <div key={t} className="bg-secondary p-8 text-center">
                <p className="font-display text-3xl font-extrabold text-primary">[—]</p>
                <p className="mt-2 text-sm text-muted-foreground">{t} — a preencher</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
