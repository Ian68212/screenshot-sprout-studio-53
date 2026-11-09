// Conteúdo central do site Rodrinox Pro.
// Edite textos, contatos, serviços e imagens aqui — as páginas leem deste arquivo.
import heroLaser from "@/assets/hero-laser.jpg";
import dobra from "@/assets/dobra.jpg";
import soldaLaser from "@/assets/solda-laser.jpg";
import soldaTig from "@/assets/solda-tig.jpg";
import cilindros from "@/assets/cilindros.jpg";
import componentes from "@/assets/componentes.jpg";
import projetos from "@/assets/projetos.jpg";
import fabrica from "@/assets/fabrica.jpg";
import soldasEspeciais from "@/assets/soldas-especiais.png.asset.json";
import projetoPersonalizado from "@/assets/projeto-personalizado.png.asset.json";

export const images = { heroLaser, dobra, soldaLaser, soldaTig, cilindros, componentes, projetos, fabrica };

export const company = {
  name: "Rodrinox Pro",
  slogan: "Soluções • Inovação • Resultados",
  tagline: "Engenharia, tecnologia e soluções para a indústria",
  email: "contato@rodrinoxpro.com.br",
  phone: "(11) 4863-1292",
  phoneHref: "tel:+551148631292",
  whatsapp: "(11) 96598-8004",
  whatsappNumber: "5511965988004",
  site: "www.rodrinoxpro.com.br",
  // Campos a preencher pela empresa:
  address: "Rodovia Presidente Tancredo de Almeida Neves, KM 59, Galpão 03\nBairro Santa Gertrudes\nJundiaí – SP\nCEP: 13205-005\nBrasil",
  hours: "[Horário de atendimento — a preencher]",
  cnpj: "[CNPJ — a preencher]",
};

export type Service = {
  slug: string;
  title: string;
  short: string;
  description: string;
  image: string;
};

export const services: Service[] = [
  {
    slug: "corte-a-laser",
    title: "Corte a laser de chapas metálicas",
    short: "Recortes precisos em chapas metálicas a partir do seu desenho.",
    description:
      "Corte de chapas metálicas com tecnologia laser, ideal para peças com geometrias detalhadas e acabamento limpo. Materiais, espessuras e dimensões são avaliados pela nossa equipe para cada projeto.",
    image: heroLaser,
  },
  {
    slug: "dobra-de-chapas",
    title: "Dobra de chapas",
    short: "Conformação de chapas conforme especificação do projeto.",
    description:
      "Dobra de chapas metálicas para formar perfis, carenagens, suportes e componentes, seguindo os ângulos e medidas definidos no projeto do cliente.",
    image: dobra,
  },
  {
    slug: "soldagem-a-laser",
    title: "Soldagem a laser",
    short: "Uniões precisas com baixa deformação e ótimo acabamento.",
    description:
      "Soldagem a laser para aplicações que exigem precisão, cordões discretos e acabamento de alto padrão. A viabilidade de cada aplicação é confirmada em avaliação técnica.",
    image: soldaLaser,
  },
  {
    slug: "soldagem-tig",
    title: "Soldagem TIG",
    short: "Soldas limpas e controladas para peças e estruturas.",
    description:
      "Soldagem TIG para peças, tubulações e estruturas metálicas, com controle do processo e atenção ao acabamento final.",
    image: soldaTig,
  },
  {
    slug: "soldas-especiais",
    title: "Soldas especiais",
    short: "Soluções de soldagem para demandas específicas.",
    description:
      "Atendimento a necessidades de soldagem fora do padrão. Conte-nos sobre o material e a aplicação para avaliarmos a melhor solução.",
    image: soldasEspeciais.url,
  },
  {
    slug: "cilindros",
    title: "Fabricação e desenvolvimento de cilindros",
    short: "Desenvolvimento e fabricação de cilindros sob demanda.",
    description:
      "Desenvolvimento e fabricação de cilindros conforme a necessidade da sua operação, do entendimento da aplicação à entrega.",
    image: cilindros,
  },
  {
    slug: "projetos-personalizados",
    title: "Projetos industriais personalizados",
    short: "Da necessidade à solução, com projeto sob medida.",
    description:
      "Entendemos o desafio da sua empresa e desenvolvemos alternativas adequadas à sua operação, com acompanhamento próximo em cada etapa.",
    image: projetoPersonalizado.url,
  },
  {
    slug: "pecas-e-componentes",
    title: "Fabricação de peças e componentes metálicos",
    short: "Peças e componentes metálicos produzidos conforme desenho.",
    description:
      "Fabricação de peças e componentes metálicos sob encomenda, integrando corte, dobra e soldagem conforme a demanda.",
    image: componentes,
  },
];

export const values = [
  { title: "Visão técnica", text: "Entendimento das necessidades e atenção a cada etapa do projeto." },
  { title: "Inovação aplicada", text: "Soluções inteligentes com foco em funcionalidade e eficiência." },
  { title: "Compromisso", text: "Atendimento transparente e foco em construir relações duradouras." },
];

export const processSteps = [
  { title: "Entendimento", text: "Você nos conta o desafio, os objetivos e as especificações." },
  { title: "Análise", text: "Avaliamos as informações e as possibilidades de atendimento." },
  { title: "Proposta", text: "Alinhamos escopo, condições e próximos passos." },
  { title: "Acompanhamento", text: "Mantemos uma comunicação próxima durante o andamento." },
];

export const gallery = [
  { src: heroLaser, alt: "Corte a laser em chapa metálica" },
  { src: fabrica, alt: "Área de produção" },
  { src: soldaTig, alt: "Soldagem TIG em tubo" },
  { src: dobra, alt: "Dobra de chapa" },
  { src: componentes, alt: "Peças e componentes metálicos" },
  { src: soldaLaser, alt: "Soldagem a laser" },
  { src: cilindros, alt: "Cilindros" },
  { src: projetos, alt: "Desenvolvimento de projeto" },
];

export const nav = [
  { to: "/", label: "Início" },
  { to: "/empresa", label: "A empresa" },
  { to: "/servicos", label: "Serviços" },
  { to: "/estrutura", label: "Estrutura" },
  { to: "/projetos", label: "Projetos" },
  { to: "/galeria", label: "Galeria" },
  { to: "/contato", label: "Contato" },
  { to: "/trabalhe-conosco", label: "Trabalhe Conosco" },
  {
    to: "/colaborador/",
    label: "Login — Acesso restrito",
    external: true,
  },
] as const;
