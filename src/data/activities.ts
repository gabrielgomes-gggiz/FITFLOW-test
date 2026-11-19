import type { ActivityModality, ActivityVariant } from "@/types";

/**
 * Catálogo de atividades com valores MET do
 * "2024 Adult Compendium of Physical Activities" (Herrmann SD et al.,
 * J Sport Health Sci. 2024;13(1):6-12. doi:10.1016/j.jshs.2023.10.010; https://pacompendium.com).
 *
 * Cada variante guarda o código específico do Compêndio. Velocidades em mph foram
 * convertidas para km/h e arredondadas. Os valores valem para adultos de 19 a 59 anos.
 * Não combinamos atividades com MET diferentes (recomendação dos autores).
 */
export const ACTIVITY_MODALITIES: ActivityModality[] = [
  {
    id: "caminhada",
    name: "Caminhada",
    icon: "walk",
    defaultVariantId: "normal",
    variants: [
      { id: "passeio", label: "Passeio bem devagar", hint: "abaixo de 3,2 km/h", met: 2.3, code: "17151" },
      { id: "lenta", label: "Lenta", hint: "3,2 a 3,9 km/h", met: 2.8, code: "17152" },
      { id: "normal", label: "Normal", hint: "4,5 a 5,5 km/h", met: 3.8, code: "17190" },
      { id: "rapida", label: "Rápida", hint: "5,6 a 6,3 km/h", met: 4.8, code: "17200" },
      { id: "muito-rapida", label: "Muito rápida", hint: "6,4 a 7,1 km/h", met: 5.5, code: "17220" },
      { id: "cachorro", label: "Passeando com o cachorro", met: 3.0, code: "17165", estimated: true },
    ],
  },
  {
    id: "corrida",
    name: "Corrida",
    icon: "run",
    defaultVariantId: "trote-livre",
    variants: [
      { id: "trote-livre", label: "Trote, ritmo livre", hint: "não sei a velocidade", met: 7.5, code: "12020" },
      { id: "6-7", label: "6,4 a 6,8 km/h", hint: "cerca de 9 min/km", met: 6.5, code: "12028" },
      { id: "8", label: "8,0 a 8,4 km/h", hint: "7 a 7 min 30 s/km", met: 8.5, code: "12030" },
      { id: "10", label: "9,7 a 10,1 km/h", hint: "cerca de 6 min/km", met: 9.3, code: "12050" },
      { id: "11", label: "11,3 km/h", hint: "cerca de 5 min 20 s/km", met: 11.0, code: "12070" },
      { id: "13", label: "12,9 km/h", hint: "cerca de 4 min 40 s/km", met: 12.0, code: "12090" },
      { id: "corrida-livre", label: "Corrida forte, ritmo livre", met: 10.5, code: "12145" },
    ],
  },
  {
    id: "ciclismo",
    name: "Ciclismo",
    icon: "bike",
    defaultVariantId: "passeio",
    variants: [
      { id: "passeio", label: "Passeio", hint: "abaixo de 16 km/h", met: 4.0, code: "01010" },
      { id: "trabalho", label: "Ida ao trabalho, ritmo próprio", met: 6.8, code: "01011" },
      { id: "leve", label: "Leve", hint: "16 a 19 km/h", met: 6.8, code: "01020" },
      { id: "moderado", label: "Moderado", hint: "19 a 22 km/h", met: 8.0, code: "01030" },
      { id: "rapido", label: "Rápido", hint: "22 a 26 km/h", met: 10.0, code: "01040" },
    ],
  },
  {
    id: "bike-ergometrica",
    name: "Bicicleta ergométrica",
    icon: "bike",
    defaultVariantId: "geral",
    variants: [
      { id: "geral", label: "Geral", met: 6.8, code: "01200" },
      { id: "leve", label: "Leve", hint: "cerca de 50 W", met: 4.0, code: "01214" },
      { id: "moderada", label: "Moderada", hint: "70 a 80 W", met: 5.8, code: "01218" },
      { id: "spinning", label: "Aula de spinning", met: 9.0, code: "01270" },
    ],
  },
  {
    id: "musculacao",
    name: "Musculação",
    icon: "dumbbell",
    defaultVariantId: "geral",
    variants: [
      { id: "geral", label: "Treino geral", hint: "8 a 15 repetições", met: 3.5, code: "02054" },
      { id: "basicos", label: "Agachamento ou levantamento terra", met: 5.0, code: "02052" },
      { id: "intenso", label: "Intenso", hint: "levantamento de peso, fisiculturismo", met: 6.0, code: "02050" },
    ],
  },
  {
    id: "funcional",
    name: "Treino funcional",
    icon: "bolt",
    defaultVariantId: "circuito",
    variants: [
      { id: "circuito", label: "Circuito, esforço moderado", met: 5.0, code: "02035" },
      { id: "circuito-intenso", label: "Circuito intenso, pouco descanso", met: 7.5, code: "02040" },
      { id: "hiit", label: "Intervalado (HIIT), esforço moderado", met: 7.0, code: "02210" },
      { id: "academia", label: "Academia, treino combinado", met: 5.0, code: "02061" },
    ],
  },
  {
    id: "casa",
    name: "Exercícios em casa",
    icon: "home",
    defaultVariantId: "geral",
    variants: [
      { id: "geral", label: "Geral", met: 3.8, code: "02064" },
      { id: "leve", label: "Leve", hint: "abdominais, prancha", met: 2.8, code: "02024" },
      { id: "moderado", label: "Moderado", hint: "flexões, afundos", met: 3.8, code: "02022" },
      { id: "intenso", label: "Intenso", hint: "burpees, polichinelos", met: 7.5, code: "02020" },
      { id: "video", label: "Vídeo de treino, moderado", met: 4.0, code: "02143" },
    ],
  },
  {
    id: "natacao",
    name: "Natação",
    icon: "water",
    defaultVariantId: "lazer",
    variants: [
      { id: "lazer", label: "Lazer, sem contar voltas", met: 6.0, code: "18310" },
      { id: "crawl-lento", label: "Crawl lento, recreativo", met: 5.8, code: "18240" },
      { id: "crawl-rapido", label: "Crawl rápido, vigoroso", met: 9.8, code: "18230" },
      { id: "peito", label: "Peito, recreativo", met: 5.3, code: "18265" },
      { id: "costas", label: "Costas, recreativo", met: 4.8, code: "18255" },
    ],
  },
  {
    id: "hidroginastica",
    name: "Hidroginástica",
    icon: "water",
    defaultVariantId: "geral",
    variants: [
      { id: "geral", label: "Geral", met: 5.5, code: "18355" },
      { id: "resistencia", label: "Exercícios de resistência", met: 3.8, code: "18356" },
      { id: "intensa", label: "Alta intensidade", met: 7.5, code: "18358" },
    ],
  },
  {
    id: "yoga",
    name: "Yoga",
    icon: "lotus",
    defaultVariantId: "geral",
    variants: [
      { id: "geral", label: "Geral", met: 2.3, code: "02175" },
      { id: "hatha", label: "Hatha", met: 2.3, code: "02150" },
      { id: "surya", label: "Saudação ao sol", met: 3.5, code: "02180" },
      { id: "power", label: "Power yoga", met: 4.0, code: "02160" },
    ],
  },
  {
    id: "pilates",
    name: "Pilates",
    icon: "lotus",
    defaultVariantId: "geral",
    variants: [{ id: "geral", label: "Geral", met: 2.8, code: "02105" }],
  },
  {
    id: "alongamento",
    name: "Alongamento",
    icon: "lotus",
    defaultVariantId: "leve",
    variants: [{ id: "leve", label: "Leve", met: 2.3, code: "02101" }],
  },
  {
    id: "danca",
    name: "Dança",
    icon: "music",
    defaultVariantId: "aerobica",
    variants: [
      { id: "aerobica", label: "Dança aeróbica, baixo impacto", met: 4.8, code: "02005" },
      { id: "salao-lenta", label: "Dança de salão, ritmo lento", met: 3.0, code: "03040" },
      { id: "salao-rapida", label: "Dança de salão, ritmo rápido", met: 5.5, code: "03030" },
      { id: "cultural", label: "Danças culturais", hint: "ex.: salsa, merengue, flamenco", met: 4.5, code: "03025" },
      { id: "contemporanea", label: "Contemporânea", met: 3.8, code: "03070" },
      { id: "vigorosa", label: "Balada ou folclórica, vigorosa", met: 9.8, code: "03031" },
    ],
  },
  {
    id: "futebol",
    name: "Futebol",
    icon: "ball",
    defaultVariantId: "recreativo",
    variants: [
      { id: "recreativo", label: "Recreativo", met: 7.0, code: "15610" },
      { id: "futsal", label: "Futsal", met: 7.8, code: "15195" },
      { id: "competitivo", label: "Competitivo", met: 9.5, code: "15605" },
    ],
  },
  {
    id: "volei",
    name: "Vôlei",
    icon: "ball",
    defaultVariantId: "recreativo",
    variants: [
      { id: "recreativo", label: "Recreativo", met: 3.0, code: "15720" },
      { id: "quadra", label: "Competitivo, em quadra", met: 6.0, code: "15711" },
      { id: "praia", label: "Vôlei de praia", met: 8.0, code: "15725" },
    ],
  },
  {
    id: "basquete",
    name: "Basquete",
    icon: "ball",
    defaultVariantId: "geral",
    variants: [
      { id: "geral", label: "Geral", met: 7.5, code: "15055" },
      { id: "jogo", label: "Jogo", met: 8.0, code: "15040" },
      { id: "arremessos", label: "Só arremessos", met: 5.0, code: "15070" },
    ],
  },
  {
    id: "handebol",
    name: "Handebol",
    icon: "ball",
    defaultVariantId: "equipe",
    variants: [{ id: "equipe", label: "Em equipe", met: 8.0, code: "15330" }],
  },
  {
    id: "tenis",
    name: "Tênis",
    icon: "ball",
    defaultVariantId: "geral",
    variants: [
      { id: "geral", label: "Geral, esforço moderado", met: 6.8, code: "15675" },
      { id: "duplas", label: "Duplas", met: 4.5, code: "15685" },
      { id: "simples", label: "Simples", met: 8.0, code: "15690" },
    ],
  },
  {
    id: "tenis-de-mesa",
    name: "Tênis de mesa",
    icon: "ball",
    defaultVariantId: "geral",
    variants: [{ id: "geral", label: "Geral", met: 4.0, code: "15660" }],
  },
  {
    id: "lutas",
    name: "Lutas e artes marciais",
    icon: "glove",
    defaultVariantId: "leve",
    variants: [
      { id: "leve", label: "Treino em ritmo leve, iniciante", met: 5.3, code: "15425" },
      {
        id: "moderado",
        label: "Ritmo moderado",
        hint: "judô, jiu-jitsu, karatê, muay thai, taekwondo",
        met: 10.3,
        code: "15430",
      },
      { id: "saco", label: "Boxe no saco de pancadas", met: 5.8, code: "15110" },
    ],
  },
  {
    id: "pular-corda",
    name: "Pular corda",
    icon: "bolt",
    defaultVariantId: "geral",
    variants: [
      { id: "geral", label: "Geral", met: 11.0, code: "02068" },
      { id: "lento", label: "Lento", hint: "menos de 100 saltos/min", met: 8.3, code: "15552" },
      { id: "moderado", label: "Moderado", hint: "100 a 120 saltos/min", met: 11.8, code: "15551" },
      { id: "rapido", label: "Rápido", hint: "120 a 160 saltos/min", met: 12.3, code: "15550" },
    ],
  },
  {
    id: "escada",
    name: "Subir escadas",
    icon: "stairs",
    defaultVariantId: "geral",
    variants: [
      { id: "lento", label: "Ritmo lento", met: 4.5, code: "17133" },
      { id: "geral", label: "Geral", met: 6.8, code: "17131" },
      { id: "rapido", label: "Ritmo rápido", met: 9.3, code: "17134" },
      { id: "simulador", label: "Simulador de escada", met: 9.3, code: "02065" },
    ],
  },
  {
    id: "trilha",
    name: "Trilha",
    icon: "mountain",
    defaultVariantId: "normal",
    variants: [
      { id: "lenta", label: "Devagar, sem carga", met: 3.8, code: "17081" },
      { id: "normal", label: "Ritmo normal, sem carga", met: 5.3, code: "17082" },
      { id: "cross", label: "Cross-country", met: 6.0, code: "17080" },
    ],
  },
  {
    id: "eliptico",
    name: "Elíptico",
    icon: "bolt",
    defaultVariantId: "moderado",
    variants: [{ id: "moderado", label: "Esforço moderado", met: 5.0, code: "02048" }],
  },
  {
    id: "remo",
    name: "Remo ergômetro",
    icon: "water",
    defaultVariantId: "moderado",
    variants: [
      { id: "moderado", label: "Moderado", hint: "menos de 100 W", met: 5.0, code: "02071" },
      { id: "vigoroso", label: "Vigoroso", hint: "100 a 149 W", met: 7.5, code: "02072" },
    ],
  },
  {
    id: "patins-skate",
    name: "Patins e skate",
    icon: "bolt",
    defaultVariantId: "skate",
    variants: [
      { id: "skate", label: "Skate, esforço moderado", met: 5.0, code: "15580" },
      { id: "patins", label: "Patins em linha, lazer", hint: "cerca de 14 km/h", met: 7.5, code: "15591" },
    ],
  },
  {
    id: "tarefas",
    name: "Tarefas domésticas",
    icon: "home",
    defaultVariantId: "geral",
    variants: [
      { id: "leve", label: "Arrumação leve", hint: "trocar roupa de cama, levar o lixo", met: 2.5, code: "05040" },
      { id: "geral", label: "Limpeza geral da casa", met: 3.3, code: "05030" },
      { id: "pesada", label: "Limpeza pesada", hint: "lavar carro, garagem", met: 3.5, code: "05020" },
    ],
  },
  {
    id: "criancas",
    name: "Brincar com crianças",
    icon: "home",
    defaultVariantId: "moderado",
    variants: [
      { id: "moderado", label: "Andando ou correndo, moderado", met: 3.5, code: "05175" },
      { id: "vigoroso", label: "Andando ou correndo, vigoroso", met: 5.8, code: "05180" },
    ],
  },
];

/** Modalidades mostradas primeiro no seletor. */
export const FEATURED_MODALITY_IDS = [
  "caminhada",
  "corrida",
  "musculacao",
  "ciclismo",
  "funcional",
  "natacao",
  "yoga",
  "danca",
] as const;

const byId = new Map(ACTIVITY_MODALITIES.map((m) => [m.id, m]));

export function getModality(id: string): ActivityModality | undefined {
  return byId.get(id);
}

export function getVariant(modalityId: string, variantId: string): ActivityVariant | undefined {
  return byId.get(modalityId)?.variants.find((v) => v.id === variantId);
}
