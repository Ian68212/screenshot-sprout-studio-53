import { createFileRoute } from "@tanstack/react-router";
import { images, values } from "@/content/site";
import { PageHero, Reveal, SectionTitle } from "@/components/site/primitives";
import { CtaBand } from "@/components/site/Footer";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/empresa")({
  head: () => ({
    meta: pageMeta(
      "A empresa",
      "Conheça a Rodrinox Pro: soluções industriais e fabricação de componentes metálicos com visão técnica, inovação e compromisso.",
    ),
  }),
  component: Empresa,
});

function Empresa() {
  return (
    <>
      <PageHero
        eyebrow="A empresa"
        title="Mais do que soluções. Parcerias que geram resultados."
        image={images.fabrica}
      />
      <section className="py-24">
        <div className="container-site grid gap-14 lg:grid-cols-2">
          <Reveal>
            <SectionTitle eyebrow="Quem somos" title="Engenharia, tecnologia e soluções para a indústria." />
          </Reveal>
          <Reveal delay={120} className="space-y-5 text-lg leading-relaxed text-muted-foreground">
            <p>
              A Rodrinox Pro é especializada em soluções industriais e na fabricação de componentes metálicos.
              Acreditamos que grandes resultados começam com soluções bem planejadas.
            </p>
            <p>
              Trabalhamos para conectar necessidades industriais a caminhos eficientes, com atenção aos detalhes,
              tecnologia e relacionamento próximo com cada cliente.
            </p>
            <p className="rounded-sm border border-dashed border-accent/60 bg-secondary p-4 text-sm">
              [Toda grande conquista começa com um sonho. E todo sonho precisa de coragem para se tornar realidade. A
              Rodrinox Pro nasceu da vontade de transformar ideias em soluções, desafios em oportunidades e trabalho em
              resultados. Entre o aço, as máquinas e a precisão de cada detalhe, construímos mais do que peças.
              Construímos caminhos, fortalecemos parcerias e aprendemos que a verdadeira força de uma empresa está nas
              pessoas que acreditam nela. Nem todos os dias foram fáceis. Houve obstáculos, decisões difíceis e momentos
              que exigiram persistência. Mas cada desafio trouxe aprendizado, e cada conquista renovou nossa
              determinação de seguir em frente. Porque o aço pode ser moldado pelo calor, mas uma grande história é
              moldada pela coragem, pelo trabalho e pela perseverança. **Rodrinox Pro — Soluções, Inovação e
              Resultados.** *Mais do que transformar metais, trabalhamos para transformar possibilidades em grandes
              realizações.*]
            </p>
          </Reveal>
        </div>
      </section>
      <section className="bg-secondary py-24">
        <div className="container-site">
          <SectionTitle center eyebrow="Nossos valores" title="O que nos move" />
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {values.map((v, n) => (
              <Reveal key={v.title} delay={n * 100} className="bg-card p-10 shadow-card">
                <span className="font-display text-4xl font-extrabold text-accent">0{n + 1}</span>
                <h3 className="mt-4 text-xl font-bold text-primary">{v.title}</h3>
                <p className="mt-3 text-muted-foreground">{v.text}</p>
              </Reveal>
            ))}
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {["Missão", "Visão", "Valores"].map((t) => (
              <div key={t} className="border bg-card p-8">
                <h3 className="font-bold text-primary">{t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t === "Valores" ? "Na Rodrinox Pro, nossos valores são a base de cada projeto e de cada parceria. Atuamos com ética, transparência e responsabilidade, valorizando a qualidade, a inovação e a melhoria contínua de nossos processos. Acreditamos no respeito às pessoas, no trabalho em equipe e no compromisso de entregar soluções industriais com precisão, segurança e excelência, construindo relações duradouras de confiança com nossos clientes e parceiros." : t === "Visão" ? "Ser referência no mercado de soluções industriais, destacando-nos pela excelência em corte, dobra, caldeiraria, soldas especiais e fabricação de máquinas e equipamentos. Buscamos crescer continuamente por meio da inovação, tecnologia e qualidade, conquistando a confiança de nossos clientes e estabelecendo novos padrões de eficiência e confiabilidade." : `[${t} da Rodrinox Pro — a preencher]`}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
