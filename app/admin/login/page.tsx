import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { getAdminSession } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entrar | Xavier Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session.status === "admin") redirect("/admin");

  return (
    <AdminLoginForm
      notice={
        session.status === "not-admin"
          ? `A conta ${session.email} não tem permissão de administrador. Entre com outra conta.`
          : undefined
      }
    />
  );
}
