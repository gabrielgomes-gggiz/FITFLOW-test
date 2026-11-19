# FitFlow

Aplicativo web de acompanhamento de saúde e hábitos: alimentação, água, atividades físicas, metas e redução de cigarro e álcool. Os registros viram indicadores simples e sugestões de pequenas ações, sem cobrança e sem julgamentos.

- **Mobile-first**: barra de navegação inferior no celular; navegação lateral no computador, com a mesma interface.
- **Dados reais e locais**: tudo é salvo no IndexedDB do navegador. Não há login, servidor nem envio de dados.
- **Funciona offline** depois da primeira visita (service worker).
- **Referências reconhecidas**: alimentos da TACO 4ª edição (NEPA/UNICAMP), atividades do Compêndio de Atividades Físicas 2024, metabolismo por Mifflin-St Jeor e recomendações da OMS. Veja [docs/CALCULOS.md](docs/CALCULOS.md).

## Como rodar

Requer Node.js 20.19 ou mais recente.

```bash
npm install
npm run dev        # http://localhost:8443
npm test           # testes dos cálculos, validações, busca e armazenamento
npm run build      # checagem de tipos + build de produção em dist/
npm run preview    # serve o build de produção
```

## Funcionalidades

| Seção | O que dá para fazer |
|---|---|
| Boas-vindas | Explorar com dados de exemplo ou criar um perfil (tudo opcional) |
| Início | Linha do tempo do dia, energia, água e movimento, metas, sugestões e resumo da semana |
| Refeições | Buscar entre 593 alimentos da TACO, informar gramas ou porções, ver nutrientes, editar e excluir; cadastrar alimentos pelo rótulo |
| Água | Somar copos com um toque, ajustar a meta, ver o histórico e o gráfico da semana |
| Atividades | 28 modalidades com ritmos do Compêndio 2024, gasto estimado e minutos da semana pela conta da OMS |
| Metas | Modelos prontos ou metas personalizadas, diárias ou semanais, com progresso automático e histórico sem “sequência perdida” |
| Cigarro e álcool | Objetivo de parar ou reduzir, dias sem consumo, economia estimada, registro de vontades e alternativas |
| Histórico | Gráficos de 7 ou 30 dias, resumo do período e detalhes de cada dia |
| Perfil e dados | Editar perfil, ajustar metas, trocar de perfil, exportar dados (JSON) e excluir dados |
| Como calculamos | Fórmulas, referências e limites de cada estimativa |

## Modo de demonstração (feira)

Na primeira abertura, o app cria um perfil fictício (“Mariana”) com 14 dias de registros coerentes, sempre relativos à data atual. Os registros de hoje só aparecem até o horário atual.

**Restaurar a demonstração entre visitantes**

- Teclado: `Ctrl + Shift + Alt + R`
- Celular ou tablet: toque 5 vezes em “Versão 1.0.0”, no fim da página **Perfil e dados**

O app confere se o perfil ativo é o de demonstração e pede confirmação antes de restaurar. A restauração recusa qualquer perfil pessoal, inclusive na camada de armazenamento. Esses atalhos não aparecem na interface. Para apagar dados de verdade, use **Perfil e dados → Excluir este perfil** ou **Apagar todos os dados**.

## Publicar na Vercel

O projeto já vem com `vercel.json` (build, saída em `dist/`, reescrita de rotas para `index.html`, cabeçalhos de segurança e cache).

1. Envie o projeto para um repositório no GitHub.
2. Na Vercel, clique em **Add New → Project** e importe o repositório. O framework (Vite) e as configurações vêm do `vercel.json`.
3. Clique em **Deploy**. Cada novo push gera uma nova versão; o service worker troca o cache sozinho.

Pela linha de comando: `npx vercel` (prévia) e `npx vercel --prod` (produção).

O `.gitattributes` original manda imagens e fontes para o Git LFS. Os ícones e a fonte do app foram excluídos dessa regra para que a Vercel publique os arquivos reais. Se você adicionar outras imagens em `public/`, elas também ficam fora do LFS.

**QR Code**: gere a partir do endereço publicado. Qualquer gerador serve; o próprio Chrome tem a opção “Criar código QR” no menu de compartilhamento.

> O `site.json` mantém `robots: noindex`, herdado do projeto original: o site não aparece em buscadores. Remova essa opção em `.figma/make/site.json` se quiser indexação.

## Privacidade (LGPD)

- Nada sai do navegador: sem servidor, sem login, sem analytics. A fonte é servida pelo próprio app e a política de segurança (CSP) bloqueia conexões externas.
- Só pedimos o que melhora as estimativas, e tudo é opcional. Não há e-mail, senha nem documento.
- O usuário pode exportar os dados (portabilidade) e excluir um perfil ou tudo (eliminação).
- A demonstração usa uma pessoa fictícia.

## Estrutura

```
src/
  types/        Tipos de domínio (mapeados a partir do FitFlow.sql)
  data/         TACO (taco.json), catálogo de atividades, modelos de metas e textos de apoio
  services/     Regras de negócio puras e testadas: energia, nutrição, água, atividades,
                metas, hábitos, relatórios, sugestões, validação, busca e demonstração
  storage/      IndexedDB (db.ts) e repositório com escopo por perfil (repository.ts)
  store/        Estado da aplicação e casos de uso (actions.ts)
  hooks/        Roteador, data de hoje, dados derivados
  components/   Componentes de interface, gráficos e formulários
  layouts/      Estrutura com barra inferior (celular) e lateral (computador)
  pages/        Uma página por seção
  utils/        Datas locais, formatação pt-BR, texto e ids
```

Detalhes em [docs/ARQUITETURA.md](docs/ARQUITETURA.md). O andamento está em [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).

## Créditos e licenças

- **TACO** — NEPA/UNICAMP. Tabela Brasileira de Composição de Alimentos, 4ª ed. revisada e ampliada, 2011. A obra permite reprodução total ou parcial com citação da fonte.
- **Compêndio de Atividades Físicas para Adultos 2024** — Herrmann SD et al., J Sport Health Sci. 2024;13(1):6-12 ([pacompendium.com](https://pacompendium.com)).
- **Fonte Atkinson Hyperlegible Next** — The Atkinson Hyperlegible Next Project Authors (Braille Institute), SIL Open Font License 1.1 (`src/assets/fonts/OFL-AtkinsonHyperlegibleNext.txt`).

O FitFlow é educativo e não substitui orientação de profissionais de saúde.
