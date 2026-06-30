import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type Commercial = {
  service_name?: string;
  monthly_value?: string;
  start_date?: string;
  due_day?: string;
  payment_method?: string;
  term_days?: string;
  notes?: string;
};

export type Contractor = {
  legal_name?: string;
  trade_name?: string;
  cnpj?: string;
  address?: string;
  address_number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  contact_name?: string;
  contact_cpf?: string;
  phone?: string;
  email?: string;
  financial_responsible?: string;
};

function brl(v?: string) {
  const n = Number((v || '').toString().replace(',', '.'));
  if (!isFinite(n) || n <= 0) return '____________';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtDate(v?: string) {
  if (!v) return '____________';
  try { return format(new Date(v + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }); }
  catch { return v; }
}
function dash(v?: string) { return v && v.trim() ? v : '____________'; }

export function ContractTemplate({
  contractor, commercial, signature,
}: {
  contractor: Contractor;
  commercial: Commercial;
  signature?: { name: string; cpf: string; date: string; ip?: string } | null;
}) {
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const fullAddress = [contractor.address, contractor.address_number, contractor.neighborhood]
    .filter(Boolean).join(', ');

  return (
    <article className="bg-white text-neutral-900 mx-auto max-w-4xl px-10 py-12 leading-relaxed text-[13.5px] font-serif">
      <header className="flex items-start justify-between mb-10 pb-6 border-b-2 border-neutral-900">
        <div>
          <div className="text-2xl font-bold tracking-tight">somus</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-600">Consultoria Estratégica</div>
        </div>
        <div className="text-right text-xs text-neutral-600">{today}</div>
      </header>

      <h1 className="text-center text-xl font-bold uppercase tracking-wide mb-8">
        Contrato de Prestação de Serviços
      </h1>

      <p className="mb-6 text-justify">
        Pelo presente instrumento particular de Contrato de Prestação de Serviços, de um lado, a seguir
        qualificada como <strong>CONTRATADA</strong>, e de outro lado, a seguir qualificada como{' '}
        <strong>CONTRATANTE</strong>, resolvem, de comum e justo acordo, celebrar o presente Contrato de
        Prestação de Serviços, mediante as cláusulas e condições seguintes:
      </p>

      <Section title="CONTRATADA">
        <Row k="Razão Social" v="SOMUS ASSESSORIA EMPRESARIAL LTDA" />
        <Row k="Nome Fantasia" v="SOMUS" />
        <Row k="CNPJ" v="33.340.310/0001-04" />
        <Row k="CEP" v="71.919-540" />
        <Row k="Endereço" v="R Copaiba Lote 01, Torre B Sala 1216, Norte (Águas Claras), Brasília - DF" />
        <Row k="Representante" v="Wilson Júnio Mendes Camargos" />
        <Row k="CPF" v="698.286.791-91" />
        <Row k="RG" v="2.516.894 SSP-DF" />
      </Section>

      <Section title="CONTRATANTE">
        <Row k="Razão Social" v={dash(contractor.legal_name)} />
        <Row k="Nome Fantasia" v={dash(contractor.trade_name)} />
        <Row k="CNPJ" v={dash(contractor.cnpj)} />
        <Row k="CEP" v={dash(contractor.zip_code)} />
        <Row k="Endereço" v={`${dash(fullAddress)}${contractor.city ? `, ${contractor.city}/${contractor.state}` : ''}`} />
        <Row k="Responsável" v={dash(contractor.contact_name)} />
        <Row k="CPF" v={dash(contractor.contact_cpf)} />
        <Row k="Telefone" v={dash(contractor.phone)} />
        <Row k="E-mail" v={dash(contractor.email)} />
        <Row k="Responsável Financeiro" v={dash(contractor.financial_responsible)} />
      </Section>

      <Clause n="CLÁUSULA PRIMEIRA – DO OBJETO">
        <p className="text-justify">
          <strong>1.1</strong> O presente contrato tem como objeto a prestação de serviços de assessoria
          estratégica de crescimento, denominada <strong>"{commercial.service_name?.trim() || 'Somus Start'}"</strong>,
          conforme detalhamento do escopo na Cláusula Segunda, visando o desenvolvimento de uma operação
          mais profissional, organizada e lucrativa para a CONTRATANTE.
        </p>
      </Clause>

      <Clause n="CLÁUSULA SEGUNDA – DO ESCOPO DE SERVIÇOS">
        <p className="text-justify mb-3">
          <strong>2.1</strong> Os serviços a serem prestados pela CONTRATADA à CONTRATANTE compreendem o
          programa contratado, uma assessoria estratégica contínua estruturada em fases evolutivas e método
          validado em negócios reais, com os blocos:
        </p>
        <ul className="list-disc pl-6 space-y-1 text-[12.5px]">
          <li><strong>Bloco 01 — Diagnóstico Estrutural</strong></li>
          <li><strong>Bloco 02 — Planejamento Estratégico</strong></li>
          <li><strong>Bloco 03 — Estruturação Operacional</strong></li>
          <li><strong>Bloco 04 — Gestão Financeira</strong></li>
          <li><strong>Bloco 05 — Evolução Comercial</strong></li>
          <li><strong>Bloco 06 — Implementação e Acompanhamento</strong></li>
          <li><strong>Acompanhamento Mensal Contínuo</strong> — reuniões mensais, relatórios de evolução e suporte estratégico contínuo.</li>
        </ul>
      </Clause>

      <Clause n="CLÁUSULA TERCEIRA – DO VALOR, FORMA E PERÍODO DE PAGAMENTO">
        <p className="text-justify"><strong>3.1</strong> O valor dos serviços é de <strong>{brl(commercial.monthly_value)}</strong> por mês, em regime de acompanhamento mensal recorrente.</p>
        <p className="text-justify mt-2"><strong>3.2</strong> O presente contrato terá início em <strong>{fmtDate(commercial.start_date)}</strong> e vigorará conforme as disposições deste contrato.</p>
        <p className="text-justify mt-2"><strong>3.3</strong> As mensalidades terão vencimento no dia <strong>{dash(commercial.due_day)}</strong> de cada mês.</p>
        <p className="text-justify mt-2"><strong>3.4</strong> Os pagamentos deverão ser efetuados via <strong>{dash(commercial.payment_method) || 'Boleto ou PIX'}</strong>, utilizando o CNPJ da CONTRATADA (33.340.310/0001-04) como chave.</p>
      </Clause>

      <Clause n="CLÁUSULA QUARTA – DOS PRAZOS">
        <p className="text-justify"><strong>4.1</strong> O prazo inicial de execução dos serviços será de <strong>{dash(commercial.term_days)} dias</strong>, contados a partir de {fmtDate(commercial.start_date)}, com reuniões de acompanhamento conforme agendamento entre as partes.</p>
        <p className="text-justify mt-2"><strong>4.2</strong> A CONTRATANTE terá o prazo de 2 (dois) dias úteis para aprovação de cada etapa dos serviços apresentados pela CONTRATADA.</p>
      </Clause>

      <Clause n="CLÁUSULA QUINTA – DAS MULTAS E PENALIDADES">
        <p className="text-justify"><strong>5.1</strong> Em caso de atraso no pagamento de qualquer mensalidade, será aplicada multa moratória de 2% (dois por cento) sobre o valor da mensalidade em atraso, juros de mora de 1% ao mês (pro rata die), com tolerância de até 5 dias úteis. Após 10 dias de atraso, a CONTRATADA poderá suspender os serviços até a regularização.</p>
        <p className="text-justify mt-2"><strong>5.2</strong> Valores já pagos pela CONTRATANTE não serão devolvidos em caso de cancelamento após o início dos serviços.</p>
      </Clause>

      <Clause n="CLÁUSULA SEXTA – DAS OBRIGAÇÕES">
        <p className="text-justify"><strong>6.1</strong> Cabe à CONTRATADA prestar os serviços com diligência, manter a CONTRATANTE informada do andamento e garantir a confidencialidade das informações.</p>
        <p className="text-justify mt-2"><strong>6.2</strong> Cabe à CONTRATANTE fornecer informações e acessos necessários, realizar aprovações nos prazos e efetuar os pagamentos conforme acordado.</p>
      </Clause>

      <Clause n="CLÁUSULA SÉTIMA – DAS EXCLUSÕES DO ESCOPO">
        <p className="text-justify"><strong>7.1</strong> Quaisquer serviços não expressamente descritos na Cláusula Segunda serão considerados fora do escopo e dependerão de aditivo contratual.</p>
      </Clause>

      <Clause n="CLÁUSULA OITAVA – DA PROPRIEDADE INTELECTUAL">
        <p className="text-justify"><strong>8.1</strong> Os direitos referentes aos materiais desenvolvidos serão transferidos à CONTRATANTE após a quitação total dos valores devidos. A CONTRATADA poderá utilizá-los em portfólio respeitada a confidencialidade.</p>
      </Clause>

      <Clause n="CLÁUSULA NONA – DA CONFIDENCIALIDADE">
        <p className="text-justify"><strong>9.1</strong> As partes manterão sigilo absoluto sobre as informações confidenciais a que tiverem acesso, obrigação que permanecerá após o término do contrato.</p>
      </Clause>

      <Clause n="CLÁUSULA DÉCIMA – DO FORO COMPETENTE">
        <p className="text-justify"><strong>10.1</strong> Fica eleito o Foro da Comarca de Brasília/DF para dirimir quaisquer dúvidas ou litígios decorrentes do presente contrato.</p>
      </Clause>

      <Clause n="CLÁUSULA DÉCIMA PRIMEIRA – DAS DISPOSIÇÕES FINAIS">
        <p className="text-justify"><strong>11.1</strong> Este instrumento constitui o acordo integral entre as partes, substituindo entendimentos anteriores.</p>
        {commercial.notes?.trim() && (
          <p className="text-justify mt-2"><strong>11.2 Observações:</strong> {commercial.notes}</p>
        )}
      </Clause>

      <div className="mt-12 pt-6 border-t-2 border-neutral-300">
        <p className="text-center mb-10 text-sm">E, por estarem assim justos e contratados, as partes assinam o presente instrumento eletronicamente.</p>
        <div className="grid grid-cols-2 gap-12 text-center text-xs">
          <div>
            <div className="border-t border-neutral-800 pt-2">
              <div className="font-bold">SOMUS ASSESSORIA EMPRESARIAL LTDA</div>
              <div className="text-neutral-600">CONTRATADA</div>
            </div>
          </div>
          <div>
            <div className="border-t border-neutral-800 pt-2">
              {signature ? (
                <>
                  <div className="font-bold">{signature.name}</div>
                  <div className="text-neutral-600">CPF: {signature.cpf}</div>
                  <div className="text-neutral-600">Assinado em {format(new Date(signature.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
                  {signature.ip && <div className="text-neutral-500 text-[10px]">IP: {signature.ip}</div>}
                </>
              ) : (
                <>
                  <div className="font-bold">{dash(contractor.legal_name)}</div>
                  <div className="text-neutral-600">CONTRATANTE</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 border border-neutral-200 rounded-md overflow-hidden">
      <h3 className="bg-neutral-100 px-4 py-2 font-bold text-[12px] tracking-wide uppercase">{title}</h3>
      <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12.5px]">{children}</div>
    </section>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="contents">
      <div className="text-neutral-500">{k}</div>
      <div className="font-medium text-neutral-900">{v}</div>
    </div>
  );
}
function Clause({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="font-bold text-[13px] mb-2 uppercase tracking-wide">{n}</h2>
      <div className="space-y-1">{children}</div>
    </section>
  );
}
