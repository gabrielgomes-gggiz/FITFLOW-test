# Cálculos e referências do FitFlow

Todas as estimativas são educativas, arredondadas e ajustáveis pelo usuário. Elas não substituem avaliação profissional. O código de cada cálculo está em `src/services/` e é coberto por testes (`*.test.ts`).

Exemplo usado neste documento: o perfil de demonstração (mulher, 31 anos, 64 kg, 168 cm, rotina “Ativo”, objetivo “Melhorar o condicionamento”).

## 1. Metabolismo basal (TMB)

Arquivo: `services/energy.ts` · Referência: Mifflin MD, St Jeor ST et al. *Am J Clin Nutr*. 1990;51(2):241-7.

```
Homens:   TMB = 10 × peso(kg) + 6,25 × altura(cm) − 5 × idade + 5
Mulheres: TMB = 10 × peso(kg) + 6,25 × altura(cm) − 5 × idade − 161
Sem sexo informado: termo médio −78 (o app avisa que é menos preciso)
```

Exemplo: 10 × 64 + 6,25 × 168 − 5 × 31 − 161 = **1.374 kcal** (exibido como 1.370).

- A idade vem da data de nascimento ou da idade informada, que “envelhece” com o passar dos anos.
- Sem idade, peso ou altura, não há estimativa: o app diz o que falta e permite definir a meta manualmente.
- Menores de 18 anos não recebem meta (as equações são para adultos).

## 2. Gasto energético total estimado (GET)

```
GET = TMB × fator de rotina
Sedentário 1,2 · Pouco ativo 1,375 · Ativo 1,55 · Muito ativo 1,725
```

Exemplo: 1.374 × 1,55 = **2.130 kcal**.

O fator já inclui a rotina e os exercícios habituais. Por isso **as atividades registradas não são somadas à meta**: somar contaria o mesmo gasto duas vezes. O app também não mostra “consumido − gasto”, que misturaria uma estimativa diária com o gasto bruto de treinos isolados.

## 3. Meta de energia

```
Meta = GET × (1 + ajuste do objetivo), nunca abaixo da TMB; arredondada para 10 kcal
Perder peso −15% · Ganhar massa +10% · Manter hábitos / Condicionamento 0%
```

O usuário pode definir a meta manualmente (1.000 a 5.000 kcal), por exemplo seguindo orientação de nutricionista.

## 4. Alimentos e nutrientes

Arquivos: `data/taco.json`, `data/foods.ts`, `services/nutrition.ts`.

- **Fonte**: Tabela Brasileira de Composição de Alimentos (TACO), 4ª ed. revisada e ampliada, NEPA/UNICAMP, 2011. Valores por 100 g de parte comestível.
- **Extração**: a partir da planilha oficial `Taco_4a_edicao_2011.xls`. Os valores foram arredondados como na tabela impressa (energia e sódio inteiros; macronutrientes e fibra com 1 casa) e conferidos, valor a valor, com uma conversão independente da mesma planilha (zero divergências numéricas).
- **Códigos especiais**: “Tr” (traço) e “NA” (não aplicável) contam como 0; “*” (análise em reavaliação) e células vazias viram *desconhecido* — o total do dia é marcado com asterisco.
- **Excluídos** por não terem energia na TACO 4: iogurte sabor abacaxi, leite de vaca desnatado UHT, leite de vaca integral e coco verde cru. Podem ser cadastrados pelo rótulo.
- **Cálculo**: `nutriente = valor por 100 g × gramas ÷ 100`. Cada registro guarda uma cópia dos valores usados.
- **Alimentos cadastrados**: aceitam valores por porção (convertidos para 100 g) e passam por limites físicos — no máximo 900 kcal/100 g e soma de proteínas, carboidratos, gorduras e fibras até 100 g/100 g.
- **Distribuição dos macronutrientes**: fatores gerais de Atwater (4/4/9 kcal/g), só como proporção. Faixas de referência (IOM, 2005): carboidratos 45–65%, proteínas 10–35%, gorduras 20–35%.
- **Frutas, legumes e verduras**: OMS, pelo menos 400 g/dia, sem batata, batata-doce, mandioca e outras raízes amiláceas. Também ficam de fora sucos, doces e frutas em calda, farinhas e preparações como pão de queijo. A lista de códigos TACO incluídos está em `data/foods.ts`.
- **Outras referências exibidas**: sódio abaixo de 2.000 mg/dia e pelo menos 25 g de fibras/dia (OMS).

## 5. Água

Arquivo: `services/hydration.ts`.

```
Meta = 35 ml × peso(kg), arredondada para 50 ml,
limitada entre a referência de bebidas e 4.000 ml
Referência de bebidas (EFSA, 2010): mulheres 1.600 ml · homens 2.000 ml · não informado 1.800 ml
```

Exemplo: 35 × 64 = 2.240 → **2.250 ml**.

A EFSA indica 2,0 L/dia (mulheres) e 2,5 L/dia (homens) de água total, da qual parte vem dos alimentos; por isso a referência de bebidas é menor. Sem peso, o app usa essa referência. Calor, exercício, gestação, amamentação e condições de saúde mudam a necessidade; a meta é ajustável (500 a 6.000 ml).

## 6. Atividades físicas

Arquivos: `data/activities.ts`, `services/activity.ts` · Referência: Herrmann SD et al. *2024 Adult Compendium of Physical Activities*. J Sport Health Sci. 2024;13(1):6-12.

```
Gasto (kcal) = MET × 3,5 × peso(kg) ÷ 200 × minutos       (equação do ACSM; 1 MET = 3,5 ml O₂/kg/min)
```

Exemplo: caminhada normal (código 17190, 3,8 MET), 30 min → 3,8 × 3,5 × 64 ÷ 200 × 30 = **128 kcal**.

- 28 modalidades e 92 variantes, cada uma com o código e o MET do Compêndio 2024. Velocidades foram convertidas de mph para km/h.
- O valor é **bruto**: inclui o gasto de repouso no mesmo período (1 MET), exibido ao registrar.
- Intensidade: leve < 3 MET, moderada 3–5,9, vigorosa ≥ 6.
- **OMS (2020)**: adultos, 150–300 min/semana de atividade moderada ou 75–150 min de vigorosa. Na conta semanal do app (“minutos ativos”), cada minuto moderado vale 1, cada vigoroso vale 2 e os leves não entram. A semana é a janela móvel dos últimos 7 dias.
- Os METs valem para adultos de 19 a 59 anos; para 60 anos ou mais há o *Older Adult Compendium*, não usado nesta versão.
- Sem peso no perfil, os minutos contam, mas não há estimativa de gasto.

## 7. IMC

```
IMC = peso(kg) ÷ altura(m)²
Adultos (OMS): < 18,5 baixo peso · 18,5–24,9 adequado · 25–29,9 sobrepeso · ≥ 30 obesidade
60 anos ou mais (SISVAN/Ministério da Saúde): ≤ 22 baixo peso · 22–27 adequado · ≥ 27 sobrepeso
Menores de 18 anos: não classificado (exige curvas por idade)
```

O IMC é exibido com o aviso de que é um indicador populacional.

## 8. Metas

Arquivo: `services/goals.ts`.

- Métricas automáticas: água (ml), minutos de atividade, minutos ativos (conta da OMS), dias com atividade, frutas/legumes/verduras (g) e refeições registradas. Métricas personalizadas: “feito/não feito” ou um valor (ex.: horas de sono).
- Diária: valor do dia. Semanal: soma dos últimos 7 dias.
- A meta de água pode ficar **vinculada** à meta do perfil (uma única fonte de verdade).
- Histórico: “atingida em X de Y dias/semanas”, ignorando o período anterior à criação. Não existe sequência que “quebra” nem mensagem de fracasso.

## 9. Cigarro e álcool

Arquivo: `services/habits.ts`.

```
Consumo habitual diário = cigarros por dia, ou doses por semana ÷ 7
Unidades evitadas = Σ max(0, habitual − consumo do dia), só nos dias registrados
Economia estimada = unidades evitadas × custo por unidade (preço do maço ÷ cigarros por maço, ou preço da dose)
```

Dias sem registro não contam como “sem consumo” nem como “com consumo”. Exemplo do perfil de demonstração: 12 dias registrados, 95 cigarros evitados × R$ 0,50 = R$ 47,50.

O app não dá orientação médica nem de desintoxicação; ele indica o atendimento gratuito do SUS (UBS, CAPS AD e Disque Saúde 136).

## 10. Sugestões

Arquivo: `services/suggestions.ts`. Regras simples, no máximo duas por vez, em tom de convite:

- Água abaixo do ritmo esperado do dia (meta distribuída entre 7h e 21h, tolerância de 15 pontos).
- Nenhuma refeição registrada depois das 10h, ou menos de 400 g de frutas/legumes/verduras depois das 11h.
- Menos de 150 minutos ativos na semana e nenhuma atividade hoje.
- Hábito acompanhado sem registro do dia depois das 18h.
