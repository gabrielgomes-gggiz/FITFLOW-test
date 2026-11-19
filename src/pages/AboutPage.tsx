import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/layouts/AppLayout";
import { ACTIVITY_LEVELS } from "@/services/energy";
import { formatNumber } from "@/utils/format";

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Card as="section" aria-labelledby={id}>
      <h2 id={id} className="text-xl font-extrabold">
        {title}
      </h2>
      <div className="mt-3 max-w-[70ch] space-y-3 text-ink-2 [&_strong]:text-ink">{children}</div>
    </Card>
  );
}

function Formula({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-mist px-4 py-3 font-bold text-ink">{children}</p>;
}

/** Documentação dos métodos, fórmulas e limitações — visível para quem usa o app. */
export function AboutPage() {
  return (
    <div>
      <PageHeader
        title="Como calculamos"
        description="Os métodos por trás dos números do FitFlow, com as referências e os limites de cada um. São estimativas educativas, não diagnósticos."
      />
      <div className="space-y-4">
        <Section id="tmb" title="Metabolismo basal">
          <p>
            É a energia que o corpo gasta em repouso completo. Usamos a equação de <strong>Mifflin-St Jeor</strong> (1990), uma das mais usadas para adultos saudáveis:
          </p>
          <Formula>Homens: 10 × peso (kg) + 6,25 × altura (cm) − 5 × idade + 5</Formula>
          <Formula>Mulheres: 10 × peso (kg) + 6,25 × altura (cm) − 5 × idade − 161</Formula>
          <p>
            Quando o sexo não é informado, usamos a média dos dois termos (−78) e avisamos que a estimativa é menos precisa. Sem idade, peso ou altura, não calculamos — o app pede o que falta.
          </p>
        </Section>

        <Section id="get" title="Gasto diário e meta de energia">
          <p>
            O metabolismo basal não é o gasto total do dia. Para estimar o <strong>gasto diário</strong>, multiplicamos o basal por um fator de rotina:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {Object.values(ACTIVITY_LEVELS).map((l) => (
              <li key={l.label}>
                <strong>{l.label}</strong> ({formatNumber(l.factor, 3)}): {l.description.toLowerCase()}
              </li>
            ))}
          </ul>
          <p>
            A <strong>meta de energia</strong> parte desse gasto: −15% para quem quer perder peso, +10% para ganhar massa muscular e sem ajuste nos demais objetivos. Ela nunca fica abaixo do metabolismo basal estimado e é arredondada para 10 kcal.
          </p>
          <p>
            <strong>Por que as atividades não somam na meta?</strong> O fator de rotina já considera os exercícios habituais. Somar o gasto de cada treino contaria o mesmo gasto duas vezes. As atividades aparecem com o próprio gasto estimado, separado.
          </p>
          <p>As equações foram feitas para adultos: para menores de 18 anos, não calculamos meta. Gestação, amamentação, doenças e uso de medicamentos mudam as necessidades. Você pode definir a meta manualmente a qualquer momento.</p>
        </Section>

        <Section id="alimentos" title="Alimentos e nutrientes">
          <p>
            Os valores vêm da <strong>Tabela Brasileira de Composição de Alimentos (TACO), 4ª edição</strong> (NEPA/UNICAMP, 2011), extraídos da planilha oficial e conferidos item a item. São 593 alimentos, com valores por 100 g de parte comestível.
          </p>
          <Formula>Nutriente consumido = valor por 100 g × quantidade (g) ÷ 100</Formula>
          <ul className="list-disc space-y-1 pl-5">
            <li>“Traço” e “não aplicável” da TACO contam como zero; análises em revisão ficam como desconhecidas (“—”) e o total é marcado com asterisco.</li>
            <li>Quatro itens sem valor de energia na TACO (entre eles o leite de vaca integral e o desnatado UHT) ficaram de fora. Você pode cadastrá-los com os dados do rótulo.</li>
            <li>Alimentos cadastrados por você aceitam valores por porção, convertidos para 100 g. Conferimos limites físicos (ex.: no máximo 900 kcal por 100 g).</li>
            <li>Cada registro guarda uma cópia dos nutrientes: editar ou excluir um alimento cadastrado não muda o histórico.</li>
          </ul>
          <p>
            <strong>Frutas, legumes e verduras:</strong> a OMS recomenda pelo menos 400 g por dia, sem contar batata, batata-doce, mandioca e outras raízes amiláceas. Sucos, doces e frutas em calda também ficam de fora da nossa conta.
          </p>
          <p>
            A <strong>distribuição da energia</strong> entre carboidratos, proteínas e gorduras usa os fatores gerais de Atwater (4, 4 e 9 kcal/g). É uma proporção aproximada: a energia total vem da própria TACO. Referências úteis: sódio abaixo de 2.000 mg por dia e pelo menos 25 g de fibras (OMS).
          </p>
        </Section>

        <Section id="agua" title="Água">
          <Formula>Meta estimada = 35 ml × peso (kg), arredondada para 50 ml</Formula>
          <p>
            É uma regra prática usada em nutrição para adultos saudáveis. Limitamos o resultado entre a parcela de bebidas das referências da <strong>EFSA (2010)</strong> — cerca de 1,6 L por dia para mulheres e 2,0 L para homens, já que os alimentos fornecem parte da água — e 4 L. Sem o peso, usamos essas referências (1,8 L quando o sexo não é informado).
          </p>
          <p>Não existe uma quantidade universal: calor, exercícios, gestação, amamentação e condições de saúde (como doenças renais ou cardíacas) mudam a necessidade. A meta é ajustável na página Água.</p>
        </Section>

        <Section id="atividades" title="Atividades físicas">
          <p>
            Cada atividade tem um valor <strong>MET</strong> (equivalente metabólico) do <strong>Compêndio de Atividades Físicas para Adultos 2024</strong> (Herrmann e colaboradores). 1 MET corresponde ao gasto em repouso. Guardamos o código do Compêndio em cada registro.
          </p>
          <Formula>Gasto estimado (kcal) = MET × 3,5 × peso (kg) ÷ 200 × minutos</Formula>
          <ul className="list-disc space-y-1 pl-5">
            <li>O valor é bruto: inclui o que o corpo gastaria em repouso no mesmo tempo (mostramos essa parte ao registrar).</li>
            <li>Intensidade pelo MET: leve abaixo de 3, moderada de 3 a 5,9 e vigorosa a partir de 6.</li>
            <li>
              A <strong>OMS (2020)</strong> recomenda a adultos de 150 a 300 minutos por semana de atividade moderada, ou metade disso de vigorosa. Por isso, na conta semanal, cada minuto vigoroso vale dois e os leves não entram. A semana é sempre a dos últimos 7 dias.
            </li>
            <li>Os METs são médias de adultos de 19 a 59 anos. Condicionamento, técnica, terreno e clima mudam o gasto real; para 60 anos ou mais, a estimativa é menos precisa.</li>
            <li>Sem o peso no perfil, os minutos contam normalmente, mas não estimamos o gasto.</li>
          </ul>
        </Section>

        <Section id="imc" title="IMC">
          <Formula>IMC = peso (kg) ÷ altura (m)²</Formula>
          <p>
            Classificação da <strong>OMS</strong> para adultos (baixo peso abaixo de 18,5; adequado de 18,5 a 24,9; sobrepeso de 25 a 29,9; obesidade a partir de 30). Para 60 anos ou mais, usamos o critério adotado pelo <strong>SISVAN/Ministério da Saúde</strong> (baixo peso até 22; adequado entre 22 e 27; sobrepeso a partir de 27). Para menores de 18 anos, o IMC precisa de curvas por idade, então não classificamos.
          </p>
          <p>O IMC é um indicador populacional: não diferencia gordura de músculo e não avalia a saúde de uma pessoa.</p>
        </Section>

        <Section id="metas" title="Metas, cigarro e álcool">
          <p>
            Metas diárias olham o dia; metas semanais somam os últimos 7 dias. Não há sequências que “quebram”: o histórico mostra em quantos dias a meta foi atingida, sem penalidades.
          </p>
          <p>
            No acompanhamento de cigarro e álcool, contamos os dias registrados sem consumo. A <strong>economia estimada</strong> compara cada dia registrado com o consumo habitual que você informou:
          </p>
          <Formula>Economia = Σ (consumo habitual diário − consumo do dia, se positivo) × preço por unidade</Formula>
          <p>Dias sem registro não entram em nenhuma conta. O FitFlow não oferece orientação médica nem tratamento; para apoio profissional, o SUS oferece atendimento gratuito.</p>
        </Section>

        <Section id="privacidade" title="Privacidade e LGPD">
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Armazenamento local:</strong> os dados ficam no IndexedDB deste navegador. Não há servidor, login nem envio para terceiros — nem as fontes vêm de serviços externos.</li>
            <li><strong>Necessidade:</strong> pedimos só o que melhora as estimativas, e tudo é opcional. Não há e-mail, senha nem documento.</li>
            <li><strong>Transparência e portabilidade:</strong> você pode exportar todos os seus dados em JSON a qualquer momento.</li>
            <li><strong>Eliminação:</strong> dá para excluir um perfil ou apagar tudo na página Perfil e dados.</li>
            <li>A demonstração usa uma pessoa fictícia.</li>
          </ul>
        </Section>

        <Section id="referencias" title="Referências">
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            <li>NEPA/UNICAMP. Tabela Brasileira de Composição de Alimentos (TACO). 4ª ed. rev. e ampl. Campinas: NEPA-UNICAMP, 2011.</li>
            <li>Mifflin MD, St Jeor ST, et al. A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr. 1990;51(2):241-7.</li>
            <li>Herrmann SD, Willis EA, Ainsworth BE, et al. 2024 Adult Compendium of Physical Activities. J Sport Health Sci. 2024;13(1):6-12.</li>
            <li>Organização Mundial da Saúde. Diretrizes sobre atividade física e comportamento sedentário. 2020.</li>
            <li>Organização Mundial da Saúde. Healthy diet (fact sheet); diretrizes de ingestão de sódio (2012) e de carboidratos (2023).</li>
            <li>EFSA Panel on Dietetic Products, Nutrition and Allergies. Scientific Opinion on Dietary Reference Values for water. EFSA Journal. 2010;8(3):1459.</li>
            <li>Institute of Medicine. Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids. 2005.</li>
            <li>Ministério da Saúde. Orientações para a coleta e análise de dados antropométricos em serviços de saúde (SISVAN). 2011.</li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
