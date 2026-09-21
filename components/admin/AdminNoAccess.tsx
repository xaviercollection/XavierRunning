import { signOutAction } from "@/app/admin/login/actions";

export function AdminNoAccess({ email }: { email: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-5 py-12 text-ink">
      <div aria-hidden="true" className="grain-fixed opacity-[0.025]" />
      <div className="admin-panel relative w-full max-w-md p-7 md:p-9">
        <p className="admin-kicker">Acesso negado</p>
        <h1 className="admin-title mt-2">Sem permissão de administrador</h1>
        <p className="mt-5 text-sm leading-relaxed text-ink-muted">
          A conta <span className="text-ink">{email || "atual"}</span> está autenticada, mas não foi
          promovida a administradora da loja. Entre com a conta do lojista ou peça a promoção
          (função <code className="text-champagne">promote_admin</code> no Supabase).
        </p>
        <form action={signOutAction} className="mt-8">
          <button type="submit" className="admin-button-secondary w-full justify-center">
            Sair
          </button>
        </form>
      </div>
    </main>
  );
}
