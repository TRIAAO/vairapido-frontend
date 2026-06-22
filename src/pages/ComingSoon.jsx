import { Construction } from "lucide-react";

export default function ComingSoon({ title = "Módulo em construção" }) {
  return (
    <div className="vr-card p-8">
      <div className="flex flex-col items-start gap-5 lg:flex-row lg:items-center">
        <div className="grid h-16 w-16 place-items-center rounded-3xl bg-yellowBrand/20 text-amber-700">
          <Construction size={34} strokeWidth={2.7} />
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            VaiRápido
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-navy">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Este painel será implementado nas próximas etapas. A base visual, autenticação e estrutura de rotas já estão preparadas.
          </p>
        </div>
      </div>
    </div>
  );
}