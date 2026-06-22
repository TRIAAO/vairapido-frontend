import { useState } from "react";
import {
  Bus,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { extractApiError, loginRequest } from "../api/client";
import { saveAuth } from "../utils/auth";

const defaultCredentials = import.meta.env.DEV
  ? {
      email: "fiscal002442@vairapido.com.br",
      password: "123456"
    }
  : {
      email: "",
      password: ""
    };

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState(defaultCredentials);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const from = location.state?.from?.pathname || "/fiscal";

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const auth = await loginRequest(form);
      saveAuth(auth);
      navigate(from, { replace: true });
    } catch (requestError) {
      setError(extractApiError(requestError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-navy px-12 text-white lg:flex lg:items-center lg:justify-center">
          <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-yellowBrand/20 blur-3xl" />
          <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative z-10 max-w-xl">
            <div className="mb-12 flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-3xl bg-yellowBrand text-navy shadow-lg shadow-yellowBrand/20">
                <Bus size={36} strokeWidth={3} />
              </div>

              <div>
                <h1 className="text-5xl font-black tracking-tight">
                  VaiRápido
                </h1>
                <p className="mt-2 text-sm font-semibold text-blue-100">
                  Controle inteligente de passagens e embarque
                </p>
              </div>
            </div>

            <h2 className="text-4xl font-black leading-tight tracking-tight">
              Painel operacional para fiscal, operador, empresa e administração.
            </h2>

            <p className="mt-6 max-w-lg text-base leading-8 text-blue-100">
              Valide bilhetes, confira documentos, marque embarques e acompanhe
              a operação com segurança em tempo real.
            </p>

            <div className="mt-10 grid gap-4">
              <div className="flex items-center gap-4 rounded-3xl bg-white/10 p-5 backdrop-blur">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-yellowBrand/20 text-yellowBrand">
                  <ShieldCheck size={23} strokeWidth={2.8} />
                </div>

                <div>
                  <p className="font-black">JWT Security</p>
                  <p className="text-sm font-semibold text-blue-100">
                    Permissões por perfil de usuário
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-3xl bg-white/10 p-5 backdrop-blur">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-yellowBrand/20 text-yellowBrand">
                  <LockKeyhole size={23} strokeWidth={2.8} />
                </div>

                <div>
                  <p className="font-black">Acesso restrito</p>
                  <p className="text-sm font-semibold text-blue-100">
                    Ambiente exclusivo para equipe autorizada
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10">
          <div className="w-full max-w-[480px]">
            <div className="mb-7 text-center lg:hidden">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-yellowBrand text-navy">
                <Bus size={34} strokeWidth={3} />
              </div>
              <h1 className="text-4xl font-black tracking-tight text-navy">
                VaiRápido
              </h1>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Painéis operacionais
              </p>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-soft lg:p-10">
              <div className="mb-8">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-yellowBrand/20 px-4 py-2 text-xs font-black uppercase tracking-wide text-amber-800">
                  <ShieldCheck size={16} />
                  Acesso restrito
                </div>

                <h2 className="text-3xl font-black tracking-tight text-navy">
                  Entrar no VaiRápido
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Use seu e-mail e senha para acessar o painel operacional.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="grid gap-5">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-navy">E-mail</span>

                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={19}
                    />

                    <input
                      className="min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-base font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-navy focus:bg-white focus:ring-4 focus:ring-navy/10"
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={updateField}
                      placeholder="fiscal@vairapido.com.br"
                      autoComplete="username"
                      required
                    />
                  </div>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-black text-navy">Senha</span>

                  <div className="relative">
                    <LockKeyhole
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={19}
                    />

                    <input
                      className="min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-14 text-base font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-navy focus:bg-white focus:ring-4 focus:ring-navy/10"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={form.password}
                      onChange={updateField}
                      placeholder="Digite sua senha"
                      autoComplete="current-password"
                      required
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </label>

                {error && (
                  <div className="rounded-2xl bg-red-50 px-4 py-4 text-sm font-bold leading-6 text-red-700">
                    {error}
                  </div>
                )}

                <button
                  className="mt-1 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-navy px-5 text-base font-black text-white shadow-lg shadow-navy/20 disabled:opacity-60"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Entrando..." : "Entrar no painel"}
                </button>
              </form>

              <div className="mt-7 rounded-2xl bg-slate-50 p-4">
                <div className="flex gap-3">
                  <div className="mt-0.5 text-confirmGreen">
                    <CheckCircle2 size={20} strokeWidth={2.8} />
                  </div>

                  <div>
                    <p className="text-sm font-black text-navy">
                      Ambiente protegido
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                      Todas as ações de embarque são validadas pelo backend e
                      registradas para auditoria.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-6 text-center text-xs font-semibold text-slate-500">
              VaiRápido · Viaje com confiança
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}