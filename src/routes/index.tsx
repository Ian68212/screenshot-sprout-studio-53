import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { images, processSteps, services, values } from "@/content/site";
import { Reveal, SectionTitle, btn } from "@/components/site/primitives";
import { CtaBand } from "@/components/site/Footer";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { mediaUrl, usePublicSite } from "@/lib/site-cms";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: pageMeta(
      "Corte a laser, dobra e soldagem industrial",
      "Rodrinox Pro: corte a laser, dobra de chapas, soldagem a laser e TIG, cilindros e componentes metálicos sob medida para a indústria.",
    ),
  }),
  component: Home,
});

const slides = [
  { image: images.heroLaser, eyebrow: "Tecnologia a serviço da indústria", title: "Precisão em cada corte. Qualidade em cada peça.", text: "Corte a laser, dobra e soldagem de componentes metálicos para impulsionar os projetos da sua empresa." },
  { image: images.fabrica, eyebrow: "Fabricação industrial", title: "Da necessidade ao resultado.", text: "Conectamos inovação, precisão e compromisso para transformar o seu projeto em realidade." },
  { image: images.soldaTig, eyebrow: "Soldagem especializada", title: "Uniões que sustentam grandes projetos.", text: "Soldagem a laser, TIG e soldas especiais com atenção a cada detalhe." },
];

function Home() {
  const cms = usePublicSite();
  const homeSlides = slides.map((s, n) => {
    const saved = cms.content(`home.hero.slide-${n + 1}`);
    return { ...s, image: mediaUrl(saved.imagem_id, s.image), eyebrow: String(saved.eyebrow ?? s.eyebrow), title: String(cms.data?.conteudos?.find((x) => x.chave === `home.hero.slide-${n + 1}`)?.titulo ?? s.title), text: String(saved.texto ?? s.text) };
  });
  const intro = cms.content("home.intro");
  const featuredProjects = cms.content("home.featured-projects");
  const featuredProjectsTitle = cms.data?.conteudos?.find((x) => x.chave === "home.featured-projects")?.titulo;
  const introValues = cms.content("home.values");
  const liveValues = Array.isArray(introValues.items) ? introValues.items : values;
  const introTitle = cms.data?.conteudos?.find((x) => x.chave === "home.intro")?.titulo;
  const liveServices = cms.items("servico");
  const visibleServices = liveServices.length ? liveServices.map((s) => ({ slug:s.slug, title:s.titulo, image:mediaUrl(s.imagem_id, services.find((item) => item.slug === s.slug)?.image ?? images.componentes) })) : services;
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % homeSlides.length), 6500);
    return () => clearInterval(t);
  }, [i]);
  const cur = homeSlides[i] ?? homeSlides[0]!;
  const go = (d: number) => setI((v) => (v + d + homeSlides.length) % homeSlides.length);

  return (
    <>
      {/* Banner principal */}
      <section className="relative h-[92vh] min-h-[600px] overflow-hidden bg-navy-deep">
        {homeSlides.map((s, idx) => (
          <div key={idx} className={cn("absolute inset-0 transition-opacity duration-1000", idx === i ? "opacity-100" : "opacity-0")} aria-hidden={idx !== i}>
            <img src={s.image} alt="" className={cn("h-full w-full object-cover", idx === i && "animate-hero-zoom")} width={1920} height={1088} />
            <div className="bg-hero-overlay absolute inset-0" />
          </div>
        ))}
        <div className="container-site relative flex h-full flex-col justify-center pt-24">
          <div key={i} className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
            <p className="eyebrow">{cur.eyebrow}</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] text-navy-foreground md:text-7xl">{cur.title}</h1>
            <p className="mt-6 max-w-xl text-lg text-navy-foreground/80">{cur.text}</p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link to="/orcamento" className={cn(btn.base, btn.accent)}>Solicitar orçamento <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/servicos" className={cn(btn.base, btn.outlineLight)}>Conheça os serviços</Link>
            </div>
          </div>
          <div className="absolute bottom-10 left-5 right-5 flex items-center justify-between md:left-8 md:right-8">
            <div className="flex gap-2">
              {homeSlides.map((_, idx) => (
                <button key={idx} onClick={() => setI(idx)} aria-label={`Banner ${idx + 1}`} className={cn("h-1 transition-all", idx === i ? "w-12 bg-accent" : "w-6 bg-navy-foreground/40")} />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => go(-1)} aria-label="Anterior" className="flex h-11 w-11 items-center justify-center border border-navy-foreground/30 text-navy-foreground hover:bg-accent hover:border-accent"><ChevronLeft className="h-5 w-5" /></button>
              <button onClick={() => go(1)} aria-label="Próximo" className="flex h-11 w-11 items-center justify-center border border-navy-foreground/30 text-navy-foreground hover:bg-accent hover:border-accent"><ChevronRight className="h-5 w-5" /></button>
            </div>
          </div>
        </div>
      </section>

      {/* Sobre */}
      <section className="py-24 md:py-32">
        <div className="container-site grid items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <SectionTitle eyebrow="Quem somos" title={String(introTitle ?? "Seu próximo projeto merece um parceiro à altura.")} text={String(intro.texto ?? "Na Rodrinox Pro, acreditamos que grandes resultados começam com soluções bem planejadas. Conectamos necessidades industriais a caminhos eficientes, com atenção aos detalhes, tecnologia e relacionamento próximo.")} />
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {liveValues.map((v: { title: string; text: string }, n: number) => (
                <div key={v.title} className="border-t-2 border-accent pt-4">
                  <span className="font-display text-sm font-bold text-accent">0{n + 1}</span>
                  <h3 className="mt-1 font-bold text-primary">{v.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{v.text}</p>
                </div>
              ))}
            </div>
            <Link to="/empresa" className={cn(btn.base, btn.outline, "mt-10")}>Conheça a empresa <ArrowRight className="h-4 w-4" /></Link>
          </Reveal>
          <Reveal delay={150} className="relative">
            <img src={mediaUrl(intro.imagem_id, images.fabrica)} alt="Área de produção da Rodrinox Pro" className="aspect-[4/5] w-full object-cover shadow-card lg:aspect-[4/4.6]" loading="lazy" width={1920} height={1088} />
            <div className="absolute -bottom-8 -left-4 hidden bg-primary p-8 md:block">
              <p className="font-display text-xl font-bold text-navy-foreground">Soluções • Inovação • Resultados</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Serviços */}
      <section className="bg-secondary py-24 md:py-32">
        <div className="container-site">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionTitle eyebrow="Serviços e soluções" title="Soluções para mover a sua indústria." />
            <Link to="/servicos" className={cn(btn.base, btn.navy, "self-start md:self-auto")}>Todos os serviços</Link>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {visibleServices.map((s, n) => (
              <Reveal key={s.slug} delay={(n % 4) * 80}>
                <Link to="/servicos" hash={s.slug} className="group relative block aspect-[3/4] overflow-hidden bg-navy-deep">
                  <img src={s.image} alt={s.title} className="h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105" loading="lazy" width={1280} height={960} />
                  <div className="bg-bottom-overlay absolute inset-0" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <span className="font-display text-xs font-bold text-accent">{String(n + 1).padStart(2, "0")}</span>
                    <h3 className="mt-1 text-lg font-bold leading-snug text-navy-foreground">{s.title}</h3>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-foreground/80 transition-colors group-hover:text-accent">Saiba mais <ArrowRight className="h-4 w-4" /></span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Processo */}
      <section className="bg-primary py-24 md:py-32">
        <div className="container-site">
          <SectionTitle light eyebrow="Nosso jeito de trabalhar" title="Do primeiro contato à melhor solução." text="Um processo objetivo para transformar a sua necessidade em uma proposta clara." />
          <div className="mt-16 grid gap-px bg-navy-foreground/10 md:grid-cols-4">
            {processSteps.map((p, n) => (
              <Reveal key={p.title} delay={n * 100} className="bg-primary p-8">
                <span className="font-display text-5xl font-extrabold text-accent/90">0{n + 1}</span>
                <h3 className="mt-5 text-xl font-bold text-navy-foreground">{p.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-navy-foreground/70">{p.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Projetos especiais */}
      <section className="py-24 md:py-32">
        <div className="container-site grid items-center gap-14 lg:grid-cols-2">
          <Reveal className="order-2 lg:order-1">
            <img src={mediaUrl(featuredProjects.imagem_id, images.projetos)} alt="Desenvolvimento de projeto industrial" className="aspect-[4/3] w-full object-cover shadow-card" loading="lazy" width={1280} height={960} />
          </Reveal>
          <Reveal delay={150} className="order-1 lg:order-2">
            <SectionTitle eyebrow={String(featuredProjects.eyebrow ?? "Projetos especiais")} title={String(featuredProjectsTitle ?? "Projetos sob medida para desafios reais.")} text={String(featuredProjects.texto ?? "Entendemos a demanda da sua operação e desenvolvemos alternativas adequadas, integrando corte, dobra, soldagem e fabricação em uma única solução.")} />
            <div className="mt-9 flex flex-wrap gap-4">
              <Link to="/projetos" className={cn(btn.base, btn.navy)}>Ver projetos</Link>
              <Link to="/galeria" className={cn(btn.base, btn.outline)}>Galeria de fotos</Link>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
