import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminNoAccess } from "@/components/admin/AdminNoAccess";
import { getAdminSession } from "@/lib/auth/admin";
import { getAdminStoreData } from "@/lib/store/queries";

// Dados e sessão são por requisição: nunca prerenderizar nem cachear esta página.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Painel Admin | Xavier Collection",
  description: "Painel administrativo para gerenciamento da Xavier Collection.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const session = await getAdminSession();
  if (session.status === "anonymous") redirect("/admin/login");
  if (session.status === "not-admin") return <AdminNoAccess email={session.email} />;

  const data = await getAdminStoreData();

  return (
    <AdminDashboard
      initialProducts={data.products}
      initialCategories={data.categories}
      initialSettings={data.settings}
      adminEmail={session.email}
    />
  );
}
