import type { Metadata } from "next";
import { Storefront } from "@/components/shop/Storefront";

export const metadata: Metadata = {
  title: "Loja | Xavier Collection",
  description:
    "Explore a seleção de moda masculina, acessórios e lifestyle da Xavier Collection.",
};

export default function StorePage() {
  return <Storefront />;
}
