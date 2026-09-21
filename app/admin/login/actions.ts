"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string };

const INVALID_CREDENTIALS = "E-mail ou senha inválidos.";

export async function signInAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Informe e-mail e senha." };
  if (email.length > 254 || password.length > 256) return { error: INVALID_CREDENTIALS };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // Mensagem única: não revela se o e-mail existe.
  if (error) return { error: INVALID_CREDENTIALS };

  // O gate de administrador está em /admin (getAdminSession); quem não for admin vê "sem acesso".
  redirect("/admin");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
