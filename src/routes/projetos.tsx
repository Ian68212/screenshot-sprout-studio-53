import { createFileRoute, Link } from "@tanstack/react-router";
import { images } from "@/content/site";
import { PageHero, Reveal, SectionTitle, btn } from "@/components/site/primitives";
import { CtaBand } from "@/components/site/Footer";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { useSiteCms } from "@/lib/site-cms";

export const Route = createFileRoute("/projetos")({
  head: () => ({ meta: pageMeta("Projetos especiais", "Projetos industriais personalizados da Rodrinox Pro: cilindros, estruturas e componentes metálicos desenvolvidos sob medida.") }),
  component: Projetos,
});

// Substitua pelos projetos reais da empresa.
const cases = [
  { title: "[Nome do projeto 1]", area: "Cilindros", image: images.cilindros },
  { title: "[Nome do projeto 2]", area: "Componentes metálicos", image: images.componentes },
  { title: "[Nome do projeto 3]", area: "Projeto personalizado", image: images.projetos },
];

function Projetos() {
  const cms = useSiteCms();
  const published = cms.itens.filter((item) => item.tipo === "projeto");
  const displayCases = published.length ? published.map((item, n) => ({
    title: item.titulo, area: item.resumo || "Projeto industrial",
    description: item.descricao || "", image: cms.imagem(item.imagem_id) || cases[n % cases.length]!.image,
  })) : cases;
  return (
    <>
      <PageHero eyebrow="Projetos especiais" title="Soluções sob medida para cada desafio." image={images.projetos} />
      <section className="py-24">
        <div className="container-site">
          <SectionTitle eyebrow="Casos" title="Projetos desenvolvidos" text="Cada projeto começa pelo entendimento da necessidade do cliente e termina com uma entrega acompanhada de perto." />
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {displayCases.map((c, n) => (
              <Reveal key={n} delay={n * 100} className="group">
                <div className="overflow-hidden"><img src={c.image} alt={c.area} className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" width={1280} height={960} /></div>
                <p className="eyebrow mt-5">{c.area}</p>
                <h3 className="mt-2 text-xl font-bold text-primary">{c.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{"description" in c ? c.description : "[Descrição do projeto — a preencher]"}</p>
              </Reveal>
            ))}
          </div>
          <div className="mt-16 text-center">
            <Link to="/orcamento" search={{ servico: "Projetos industriais personalizados" }} className={cn(btn.base, btn.accent)}>Tenho um projeto especial</Link>
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
