
import {
  BarChart3,
  Building2,
  Bus,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileBarChart,
  Gauge,
  MessageCircle,
  Route,
  ShieldCheck,
  TicketCheck,
  TrendingUp,
  Users,
  WalletCards,
  Wrench
} from "lucide-react";

function PageHeader({
  badge,
  title,
  description,
  icon: Icon = Gauge,
  rightContent
}) {
  return (
    <section className="overflow-hidden rounded-[2rem] bg-navy text-white shadow-soft">
      <div className="border-b-8 border-yellowBrand px-7 py-8 lg:px-10 lg:py-10">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-yellowBrand">
              <Icon size={16} />
              {badge}
            </div>

            <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight lg:text-5xl">
              {title}
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100">
              {description}
            </p>
          </div>

          {rightContent}
        </div>
      </div>
    </section>
  );
}

function MetricCard({ title, value, description, icon: Icon, tone = "navy" }) {
  const toneClasses = {
    navy: "bg-navy/10 text-navy",
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellowBrand/20 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    red: "bg-red-100 text-red-700"
  };

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <h3 className="mt-3 text-4xl font-black tracking-tight text-navy">
            {value}
          </h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            {description}
          </p>
        </div>

        <div className={`grid h-13 w-13 place-items-center rounded-2xl ${toneClasses[tone]}`}>
          <Icon size={26} strokeWidth={2.8} />
        </div>
      </div>
    </article>
  );
}

function StatusPill({ children, tone = "green" }) {
  const tones = {
    green: "bg-green-50 text-green-700 ring-green-200",
    yellow: "bg-yellowBrand/20 text-amber-800 ring-yellowBrand/40",
    red: "bg-red-50 text-red-700 ring-red-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    slate: "bg-slate-100 text-slate-700 ring-slate-200"
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${tones[tone]}`}>
      {children}
    </span>
  );
}

function TableCard({ title, description, columns, rows }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white shadow-soft">
      <div className="border-b border-slate-200 px-7 py-6">
        <h2 className="text-2xl font-black text-navy">{title}</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          {description}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-7 py-4 text-xs font-black uppercase tracking-wide text-slate-500"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-slate-100 last:border-0">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-7 py-5 text-sm font-bold text-slate-700"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ActionCard({ title, description, icon: Icon, buttonLabel }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-navy/10 text-navy">
        <Icon size={28} strokeWidth={2.8} />
      </div>

      <h3 className="mt-5 text-xl font-black text-navy">{title}</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        {description}
      </p>

      <button
        type="button"
        className="mt-5 min-h-12 rounded-2xl bg-slate-100 px-5 text-sm font-black text-navy"
      >
        {buttonLabel}
      </button>
    </article>
  );
}

export function DashboardPage() {
  return (
    <div className="grid gap-7">
      <PageHeader
        badge="Visão geral"
        title="Dashboard operacional"
        description="Acompanhe os principais indicadores da operação VaiRápido em tempo real."
        icon={Gauge}
        rightContent={
          <div className="rounded-3xl bg-white/10 p-5">
            <p className="text-xs font-black uppercase text-blue-100">
              Ambiente
            </p>
            <p className="mt-1 text-3xl font-black text-yellowBrand">
              Backoffice
            </p>
            <p className="text-sm font-bold text-white">
              Gestão integrada
            </p>
          </div>
        }
      />

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Bilhetes emitidos"
          value="128"
          description="Total estimado no ambiente atual."
          icon={TicketCheck}
          tone="green"
        />
        <MetricCard
          title="Embarques"
          value="37"
          description="Bilhetes marcados como utilizados."
          icon={CheckCircle2}
          tone="blue"
        />
        <MetricCard
          title="Reservas ativas"
          value="64"
          description="Reservas aguardando viagem."
          icon={ClipboardList}
          tone="yellow"
        />
        <MetricCard
          title="WhatsApp"
          value="Online"
          description="Fluxo de compra via bot ativo."
          icon={MessageCircle}
          tone="navy"
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <ActionCard
          title="Painel do Fiscal"
          description="Consultar bilhetes, validar documentos e marcar embarque."
          icon={ShieldCheck}
          buttonLabel="Acessar fiscal"
        />
        <ActionCard
          title="Operação"
          description="Acompanhar viagens, reservas, passageiros e disponibilidade."
          icon={Bus}
          buttonLabel="Ver operação"
        />
        <ActionCard
          title="Relatórios"
          description="Conferir indicadores financeiros, operacionais e de embarque."
          icon={FileBarChart}
          buttonLabel="Abrir relatórios"
        />
      </section>

      <TableCard
        title="Últimos eventos operacionais"
        description="Resumo visual da operação recente. A integração real com API será ligada nos próximos módulos."
        columns={["Evento", "Módulo", "Status", "Horário"]}
        rows={[
          ["Bilhete validado pelo fiscal", "Embarque", <StatusPill>Concluído</StatusPill>, "Hoje"],
          ["Reserva criada via WhatsApp", "Bot", <StatusPill tone="blue">Processada</StatusPill>, "Hoje"],
          ["Pagamento confirmado", "Bilhete", <StatusPill>Emitido</StatusPill>, "Hoje"],
          ["Tentativa de embarque duplicado", "Fiscal", <StatusPill tone="yellow">Bloqueado</StatusPill>, "Hoje"]
        ]}
      />
    </div>
  );
}

export function OperatorPanel() {
  return (
    <div className="grid gap-7">
      <PageHeader
        badge="Operação"
        title="Painel do operador"
        description="Controle viagens, reservas, passageiros, bilhetes e suporte operacional."
        icon={ClipboardList}
        rightContent={
          <div className="rounded-3xl bg-white/10 p-5">
            <p className="text-xs font-black uppercase text-blue-100">Módulo</p>
            <p className="mt-1 text-3xl font-black text-yellowBrand">Operador</p>
            <p className="text-sm font-bold text-white">Em construção</p>
          </div>
        }
      />

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Viagens do dia" value="12" description="Partidas programadas." icon={CalendarClock} tone="blue" />
        <MetricCard title="Reservas" value="48" description="Reservas ativas." icon={ClipboardList} tone="yellow" />
        <MetricCard title="Bilhetes" value="41" description="Bilhetes emitidos." icon={TicketCheck} tone="green" />
        <MetricCard title="Suporte" value="3" description="Atendimentos pendentes." icon={Wrench} tone="red" />
      </section>

      <TableCard
        title="Fila operacional"
        description="Primeira estrutura visual para acompanhamento do operador."
        columns={["Prioridade", "Atividade", "Responsável", "Status"]}
        rows={[
          ["Alta", "Verificar embarque São Paulo → Rio", "Operador", <StatusPill tone="yellow">Pendente</StatusPill>],
          ["Média", "Conferir reservas próximas de expirar", "Operador", <StatusPill tone="blue">Em análise</StatusPill>],
          ["Baixa", "Acompanhar mensagens WhatsApp", "Suporte", <StatusPill>Normal</StatusPill>]
        ]}
      />
    </div>
  );
}

export function CompaniesPanel() {
  return (
    <div className="grid gap-7">
      <PageHeader
        badge="Empresas"
        title="Gestão de empresas"
        description="Administre empresas de transporte, nomes comerciais, rotas e vínculos operacionais."
        icon={Building2}
        rightContent={
          <button
            type="button"
            className="min-h-14 rounded-2xl bg-yellowBrand px-6 font-black text-navy"
          >
            Nova empresa
          </button>
        }
      />

      <section className="grid gap-5 md:grid-cols-3">
        <MetricCard title="Empresas" value="4" description="Cadastradas na operação." icon={Building2} tone="navy" />
        <MetricCard title="Rotas" value="9" description="Rotas ativas." icon={Route} tone="blue" />
        <MetricCard title="Viagens" value="22" description="Viagens programadas." icon={Bus} tone="green" />
      </section>

      <TableCard
        title="Empresas cadastradas"
        description="Lista visual inicial. Nos próximos módulos será conectada ao endpoint real."
        columns={["Empresa", "Nome comercial", "Status", "Operação"]}
        rows={[
          ["Atlântico Bus Teste LTDA", "Atlântico Bus", <StatusPill>Ativa</StatusPill>, "Brasil"],
          ["Expresso Teste", "Expresso Teste", <StatusPill>Ativa</StatusPill>, "Brasil"],
          ["VaiRápido Demo", "VaiRápido Demo", <StatusPill tone="slate">Demo</StatusPill>, "Brasil"]
        ]}
      />
    </div>
  );
}

export function UsersPanel() {
  return (
    <div className="grid gap-7">
      <PageHeader
        badge="Permissões"
        title="Usuários e acessos"
        description="Controle administradores, gestores, operadores e fiscais com permissões por perfil."
        icon={Users}
        rightContent={
          <button
            type="button"
            className="min-h-14 rounded-2xl bg-yellowBrand px-6 font-black text-navy"
          >
            Novo usuário
          </button>
        }
      />

      <section className="grid gap-5 md:grid-cols-4">
        <MetricCard title="Admins" value="1" description="Acesso total." icon={ShieldCheck} tone="navy" />
        <MetricCard title="Gestores" value="2" description="Empresas vinculadas." icon={Building2} tone="blue" />
        <MetricCard title="Operadores" value="3" description="Operação e fiscal." icon={Users} tone="green" />
        <MetricCard title="Inativos" value="0" description="Usuários bloqueados." icon={Wrench} tone="red" />
      </section>

      <TableCard
        title="Usuários recentes"
        description="Base visual para futura gestão completa de usuários."
        columns={["Nome", "E-mail", "Perfil", "Status"]}
        rows={[
          ["Fiscal VaiRápido", "fiscal002442@vairapido.com.br", "OPERATOR", <StatusPill>Ativo</StatusPill>],
          ["Administrador", "admin@vairapido.com", "ADMIN", <StatusPill tone="blue">Sistema</StatusPill>],
          ["Gestor Empresa", "gestor.expresso@vairapido.com", "COMPANY_ADMIN", <StatusPill>Ativo</StatusPill>]
        ]}
      />
    </div>
  );
}

export function ReportsPanel() {
  return (
    <div className="grid gap-7">
      <PageHeader
        badge="Relatórios"
        title="Relatórios e indicadores"
        description="Acompanhe resultados financeiros, ocupação, reservas, embarques e performance operacional."
        icon={FileBarChart}
        rightContent={
          <div className="rounded-3xl bg-white/10 p-5">
            <p className="text-xs font-black uppercase text-blue-100">Visão</p>
            <p className="mt-1 text-3xl font-black text-yellowBrand">Gestão</p>
            <p className="text-sm font-bold text-white">Indicadores</p>
          </div>
        }
      />

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Receita" value="BRL 4.920" description="Valor estimado emitido." icon={WalletCards} tone="green" />
        <MetricCard title="Ocupação" value="68%" description="Média das viagens." icon={BarChart3} tone="blue" />
        <MetricCard title="Embarques" value="37" description="Bilhetes utilizados." icon={CheckCircle2} tone="yellow" />
        <MetricCard title="Crescimento" value="+14%" description="Comparativo visual." icon={TrendingUp} tone="navy" />
      </section>

      <TableCard
        title="Relatórios disponíveis"
        description="Estrutura inicial dos relatórios que serão conectados ao backend."
        columns={["Relatório", "Descrição", "Status", "Ação"]}
        rows={[
          ["Financeiro", "Receita por empresa, rota e período", <StatusPill tone="blue">Planejado</StatusPill>, "Abrir"],
          ["Operacional", "Viagens, reservas, poltronas e ocupação", <StatusPill tone="blue">Planejado</StatusPill>, "Abrir"],
          ["Embarque", "Validações, bilhetes usados e auditoria", <StatusPill tone="yellow">Em andamento</StatusPill>, "Abrir"]
        ]}
      />
    </div>
  );
}