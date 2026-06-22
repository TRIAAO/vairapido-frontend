import { useState } from "react";
import { Bus, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { extractApiError, loginRequest } from "../api/client";
import { saveAuth } from "../utils/auth";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: "fiscal002442@vairapido.com.br",
    password: "123456"
  });

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
        <section className="hidden items-center justify-center bg-navy px-12 text-white lg:flex">
          <div className="max-w-xl">
            <div className="mb-10 flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-3xl bg-yellowBrand text-navy">
                <Bus size={36} strokeWidth={3} />
              </div>
              <div>
                <h1 className="text-5xl font-black tracking-tight">VaiRápido</h1>
                <p className="mt-2 text-blue-100">Controle inteligente de passagens e embarque</p>
              </div>
            </div>

            <h2 className="text-4xl font-black leading-tight tracking-tight">
              Painel operacional para fiscal, operador, empresa e administração.
            </h2>

            <p className="mt-6 text-lg leading-8 text-blue-100">
              Valide bilhetes, confira documentos, marque embarques e acompanhe a operação com segurança.
            </p>

            <div className="mt-10 grid gap-4">
              <div className="flex items-center gap-3 rounded-3xl bg-white/10 p-5">
                <ShieldCheck className="text-yellowBrand" />
                <span className="font-bold">JWT Security com permissões por perfil</span>
              </div>
              <div className="flex items-center gap-3 rounded-3xl bg-white/10 p-5">
                <LockKeyhole className="text-yellowBrand" />
                <span className="font-bold">Acesso restrito para equipe autorizada</span>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-slate-100 px-4 py-10">
          <div className="vr-card w-full max-w-md p-8">
            <div className="mb-8">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-yellowBrand/20 px-4 py-2 text-xs font-black uppercase tracking-wide text-amber-800">
                <ShieldCheck size={16} />
                Acesso restrito
              </div>

              <h2 className="text-3xl font-black tracking-tight text-navy">
                Entrar no VaiRápido
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Use seu e-mail e senha para acessar o painel operacional.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-5">
              <label className="grid gap-2">
                <span className="text-sm font-black text-navy">E-mail</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    className="vr-input pl-11"
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
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    className="vr-input pl-11"
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={updateField}
                    placeholder="Digite sua senha"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </label>

              {error && (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {error}
                </div>
              )}

              <button
                className="vr-btn-primary"
                type="submit"
                disabled={loading}
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}