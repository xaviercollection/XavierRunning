"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, type LoginState } from "@/app/admin/login/actions";

const INITIAL_STATE: LoginState = {};

export function AdminLoginForm({ notice }: { notice?: string }) {
  const [state, formAction, pending] = useActionState(signInAction, INITIAL_STATE);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-5 py-12 text-ink">
      <div aria-hidden="true" className="grain-fixed opacity-[0.025]" />

      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-10 flex items-baseline justify-center gap-3" aria-label="Xavier Collection">
          <span className="font-display text-base text-gold">X</span>
          <span className="font-display text-[12px] tracking-[0.25em] text-champagne uppercase">
            Xavier Admin
          </span>
        </Link>

        <form action={formAction} className="admin-panel p-7 md:p-9" noValidate>
          <p className="admin-kicker">Acesso restrito</p>
          <h1 className="admin-title mt-2">Entrar no painel</h1>

          {notice && (
            <p className="mt-5 border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-xs leading-relaxed text-amber-200">
              {notice}
            </p>
          )}

          <div className="mt-7 grid gap-5">
            <label className="block">
              <span className="mb-2 block text-[8px] tracking-[0.22em] text-ink-faint uppercase">E-mail</span>
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
                className="admin-input"
                placeholder="voce@exemplo.com"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-[8px] tracking-[0.22em] text-ink-faint uppercase">Senha</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="admin-input"
              />
            </label>
          </div>

          {state.error && (
            <p role="alert" className="mt-5 text-xs text-red-300">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="admin-button-primary mt-8 w-full justify-center py-4 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-8 text-center text-[10px] tracking-[0.2em] text-ink-faint uppercase">
          <Link href="/" className="link-xc">
            Voltar ao site
          </Link>
        </p>
      </div>
    </main>
  );
}
