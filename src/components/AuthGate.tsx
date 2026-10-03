import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type Props = { children: (user: User) => React.ReactNode };

function AuthGate({ children }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);
    const response = mode === "sign-in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName.trim() } } });
    setIsSubmitting(false);
    if (response.error) { setMessage(response.error.message); return; }
    if (mode === "sign-up" && !response.data.session) setMessage("Revisa tu correo para confirmar tu cuenta y luego inicia sesión.");
  }

  if (isLoading) return <main className="auth-page"><p>Cargando MyDate…</p></main>;
  if (session) return <>{children(session.user)}</>;

  return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><span>✦</span><div><p>MyDate</p><small>Tu tiempo, con intención</small></div></div><h1>{mode === "sign-in" ? "Bienvenido de vuelta" : "Crea tu cuenta"}</h1><p className="auth-description">{mode === "sign-in" ? "Inicia sesión para comenzar a sincronizar tu planificación." : "Usa un correo y contraseña. Podrás usar esta cuenta en otros equipos más adelante."}</p><form onSubmit={submit}>{mode === "sign-up" && <label className="form-field">Tu nombre<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" placeholder="Ej. Rodrigo" required /></label>}<label className="form-field">Correo electrónico<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label><label className="form-field">Contraseña<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "sign-in" ? "current-password" : "new-password"} minLength={6} required /></label>{message && <p className="auth-message">{message}</p>}<button type="submit" className="primary-button auth-submit" disabled={isSubmitting}>{isSubmitting ? "Un momento…" : mode === "sign-in" ? "Iniciar sesión" : "Crear cuenta"}</button></form><button type="button" className="auth-mode-switch" onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setMessage(""); }}>{mode === "sign-in" ? "¿No tienes cuenta? Créala aquí" : "¿Ya tienes cuenta? Inicia sesión"}</button></section></main>;
}

export default AuthGate;
