"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { signOutAction } from "@/app/admin/login/actions";
import { FinanceDashboard } from "@/components/admin/FinanceDashboard";
import { formatStorePrice, type StoreBadge } from "@/lib/storeCatalog";
import {
  deleteProductAction,
  reorderCategoriesAction,
  reorderFeaturedAction,
  saveProductAction,
  saveStoreSettingsAction,
  setCategoryVisibilityAction,
  setProductFeaturedAction,
  setProductStatusAction,
} from "@/lib/store/admin-actions";
import type {
  ActionResult,
  AdminCategory,
  AdminProduct,
  FeaturedState,
  ProductStatus,
  StoreSettings,
} from "@/lib/store/types";
import { safeImageSrc } from "@/lib/store/mappers";
import { createClient } from "@/lib/supabase/client";
import { getProductImagesPublicPrefixSafe } from "@/lib/supabase/env";

type AdminSection = "overview" | "finance" | "products" | "featured" | "categories" | "store";

const SECTION_LABELS: Record<AdminSection, { label: string; eyebrow: string }> = {
  overview: { label: "Visão geral", eyebrow: "Painel administrativo" },
  finance: { label: "Financeiro", eyebrow: "Saúde da operação" },
  products: { label: "Produtos", eyebrow: "Catálogo" },
  featured: { label: "Destaques", eyebrow: "Curadoria da vitrine" },
  categories: { label: "Categorias", eyebrow: "Organização da loja" },
  store: { label: "Vitrine e conteúdo", eyebrow: "Identidade da loja" },
};

/** Uma Server Action pode lançar (rede caiu, deploy em andamento). Nunca deixe a UI presa por isso. */
async function runAction<T>(action: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await action();
  } catch {
    return { ok: false, error: "Sem conexão com o servidor. Verifique a internet e tente novamente." };
  }
}

const DEFAULT_IMAGE = "/images/store/xavier-category-clothing.webp";
const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
const UPLOAD_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

function makeEmptyProduct(categories: AdminCategory[]): AdminProduct {
  return {
    id: "",
    brand: "Xavier",
    name: "",
    // Como no protótipo: "Camisas" por padrão (se o lojista ainda a tiver), senão a primeira categoria.
    category: (categories.find((item) => item.name === "Camisas") ?? categories[0])?.name ?? "",
    price: 0,
    image: DEFAULT_IMAGE,
    colors: [{ name: "Preto", hex: "#111111" }],
    sizes: ["P", "M", "G"],
    description: "",
    stock: 0,
    status: "draft",
    isFeatured: false,
  };
}

interface AdminDashboardProps {
  initialProducts: AdminProduct[];
  initialCategories: AdminCategory[];
  initialSettings: StoreSettings;
  adminEmail: string;
}

export function AdminDashboard({
  initialProducts,
  initialCategories,
  initialSettings,
  adminEmail,
}: AdminDashboardProps) {
  const [section, setSection] = useState<AdminSection>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [products, setProducts] = useState<AdminProduct[]>(initialProducts);
  const [categories, setCategories] = useState<AdminCategory[]>(initialCategories);
  const [productQuery, setProductQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("all");
  const [draft, setDraft] = useState<AdminProduct | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminProduct | null>(null);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(initialSettings);

  const visibleProducts = useMemo(() => {
    const query = productQuery.trim().toLocaleLowerCase("pt-BR");
    return products.filter((product) => {
      const matchesQuery =
        !query ||
        `${product.name} ${product.brand} ${product.category}`
          .toLocaleLowerCase("pt-BR")
          .includes(query);
      const matchesCategory = categoryFilter === "Todos" || product.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || product.status === statusFilter;
      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [categoryFilter, productQuery, products, statusFilter]);

  const featuredProducts = products
    .filter((product) => product.isFeatured)
    .sort((a, b) => (a.featured ?? 99) - (b.featured ?? 99));
  const lowStockProducts = products.filter(
    (product) => product.status === "active" && product.stock <= 5,
  );
  const activeProducts = products.filter((product) => product.status === "active");

  function selectSection(nextSection: AdminSection) {
    setSection(nextSection);
    setSidebarOpen(false);
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function openNewProduct() {
    setIsNewProduct(true);
    setDraft(makeEmptyProduct(categories));
  }

  function openEditProduct(product: AdminProduct) {
    setIsNewProduct(false);
    setDraft({ ...product, colors: [...product.colors], sizes: [...product.sizes] });
  }

  async function saveProduct() {
    if (!draft || saving || !draft.name.trim() || !draft.brand.trim()) return;
    const category = categories.find((item) => item.name === draft.category);
    if (!category) {
      showToast("Selecione uma categoria.");
      return;
    }

    setSaving(true);
    const result = await runAction(() => saveProductAction({
      id: isNewProduct ? undefined : draft.id,
      brand: draft.brand,
      name: draft.name,
      description: draft.description,
      categoryId: category.id,
      price: draft.price,
      originalPrice: draft.originalPrice ?? null,
      image: draft.image,
      imagePosition: draft.imagePosition ?? null,
      imageFit: draft.imageFit ?? "cover",
      colors: draft.colors,
      sizes: draft.sizes,
      badge: draft.badge ?? null,
      status: draft.status,
      stock: draft.stock,
      isFeatured: draft.isFeatured,
    }));
    setSaving(false);

    if (!result.ok) {
      showToast(result.error);
      return;
    }
    const saved = result.data;
    setProducts((current) =>
      isNewProduct
        ? [saved, ...current]
        : current.map((product) => (product.id === saved.id ? saved : product)),
    );
    showToast(isNewProduct ? "Produto criado." : "Alterações do produto salvas.");
    setDraft(null);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    const result = await runAction(() => deleteProductAction(target.id));
    if (!result.ok) {
      showToast(result.error);
      return;
    }
    setProducts((current) => current.filter((product) => product.id !== target.id));
    setPendingDelete(null);
    showToast("Produto removido.");
  }

  async function toggleProductStatus(productId: string) {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    const previous = product.status;
    const next: ProductStatus = previous === "active" ? "draft" : "active";

    const applyStatus = (status: ProductStatus) =>
      setProducts((current) =>
        current.map((item) => (item.id === productId ? { ...item, status } : item)),
      );

    applyStatus(next);
    const result = await runAction(() => setProductStatusAction(productId, next));
    if (!result.ok) {
      applyStatus(previous);
      showToast(result.error);
    }
  }

  function applyFeaturedState(states: FeaturedState[]) {
    const byId = new Map(states.map((state) => [state.id, state]));
    setProducts((current) =>
      current.map((product) => {
        const state = byId.get(product.id);
        return state
          ? { ...product, isFeatured: state.isFeatured, featured: state.featured ?? undefined }
          : product;
      }),
    );
  }

  async function toggleFeatured(productId: string) {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    const result = await runAction(() => setProductFeaturedAction(productId, !product.isFeatured));
    if (!result.ok) {
      showToast(result.error);
      return;
    }
    applyFeaturedState(result.data);
  }

  async function moveFeatured(productId: string, direction: -1 | 1) {
    const ordered = [...featuredProducts];
    const index = ordered.findIndex((product) => product.id === productId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];

    const result = await runAction(() => reorderFeaturedAction(ordered.map((product) => product.id)));
    if (!result.ok) {
      showToast(result.error);
      return;
    }
    applyFeaturedState(result.data);
  }

  async function moveCategory(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const previous = categories;
    const next = [...categories];
    [next[index], next[target]] = [next[target], next[index]];

    setCategories(next);
    const result = await runAction(() => reorderCategoriesAction(next.map((category) => category.id)));
    if (!result.ok) {
      setCategories(previous);
      showToast(result.error);
    }
  }

  async function toggleCategoryVisibility(categoryId: string) {
    const category = categories.find((item) => item.id === categoryId);
    if (!category) return;
    const visible = !category.visible;

    const applyVisibility = (value: boolean) =>
      setCategories((current) =>
        current.map((item) => (item.id === categoryId ? { ...item, visible: value } : item)),
      );

    applyVisibility(visible);
    const result = await runAction(() => setCategoryVisibilityAction(categoryId, visible));
    if (!result.ok) {
      applyVisibility(category.visible);
      showToast(result.error);
    }
  }

  async function saveStoreSettings() {
    if (saving) return;
    setSaving(true);
    const result = await runAction(() => saveStoreSettingsAction(storeSettings));
    setSaving(false);
    if (!result.ok) {
      showToast(result.error);
      return;
    }
    setStoreSettings(result.data);
    showToast("Configurações da vitrine salvas.");
  }

  const currentLabel = SECTION_LABELS[section];

  return (
    <main className="min-h-screen bg-[#050505] text-ink">
      <div aria-hidden="true" className="grain-fixed opacity-[0.025]" />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col border-r border-white/[0.07] bg-[#080808] transition-transform duration-500 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/[0.07] px-6">
          <Link href="/" className="flex items-baseline gap-3" aria-label="Xavier Collection">
            <span className="font-display text-base text-gold">X</span>
            <span className="font-display text-[12px] tracking-[0.25em] text-champagne uppercase">
              Xavier Admin
            </span>
          </Link>
          <button type="button" onClick={() => setSidebarOpen(false)} className="p-2 text-ink-muted lg:hidden" aria-label="Fechar menu">
            <AdminIcon kind="close" className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-6">
          <div className="border border-gold/20 bg-gold/[0.04] px-4 py-3">
            <p className="text-[8px] tracking-[0.3em] text-gold uppercase">Conectado ao Supabase</p>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">Alterações são salvas no banco de dados e refletem na loja.</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3" aria-label="Navegação administrativa">
          {(Object.keys(SECTION_LABELS) as AdminSection[]).map((item) => {
            const active = section === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => selectSection(item)}
                className={`group flex w-full items-center gap-3 border-l px-4 py-3.5 text-left text-[11px] tracking-[0.12em] uppercase transition-colors ${
                  active
                    ? "border-gold bg-gold/[0.07] text-gold"
                    : "border-transparent text-ink-muted hover:bg-white/[0.025] hover:text-ink"
                }`}
              >
                <AdminIcon kind={item} className="h-[17px] w-[17px]" />
                {SECTION_LABELS[item].label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.07] p-5">
          <p className="mb-4 truncate text-[10px] text-ink-faint" title={adminEmail}>{adminEmail}</p>
          <Link href="/loja" className="flex items-center justify-between text-[10px] tracking-[0.18em] text-ink-muted uppercase transition-colors hover:text-gold">
            Ver loja publicada
            <span aria-hidden="true">↗</span>
          </Link>
          <form action={signOutAction} className="mt-4">
            <button type="submit" className="flex w-full items-center justify-between text-[10px] tracking-[0.18em] text-ink-muted uppercase transition-colors hover:text-gold">
              Sair
              <span aria-hidden="true">→</span>
            </button>
          </form>
        </div>
      </aside>

      {sidebarOpen && (
        <button type="button" className="fixed inset-0 z-40 bg-black/75 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu" />
      )}

      <div className="min-h-screen lg:pl-[268px]">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-white/[0.07] bg-[#050505]/90 px-[clamp(1.25rem,4vw,3rem)] backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setSidebarOpen(true)} className="p-2 text-ink-muted lg:hidden" aria-label="Abrir menu">
              <AdminIcon kind="menu" className="h-5 w-5" />
            </button>
            <div>
              <p className="text-[8px] tracking-[0.3em] text-gold uppercase">{currentLabel.eyebrow}</p>
              <h1 className="mt-1 font-display text-2xl md:text-3xl">{currentLabel.label}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-[9px] tracking-[0.15em] text-ink-faint uppercase sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Back-end conectado
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/25 bg-gold/[0.08] font-display text-sm text-gold">XC</div>
          </div>
        </header>

        <div className="mx-auto max-w-[1540px] px-[clamp(1.25rem,4vw,3rem)] py-8 md:py-10">
          {section === "overview" && (
            <OverviewSection
              products={products}
              activeCount={activeProducts.length}
              featuredCount={featuredProducts.length}
              lowStockProducts={lowStockProducts}
              onNavigate={selectSection}
              onEdit={openEditProduct}
              onNew={openNewProduct}
            />
          )}

          {section === "finance" && (
            <FinanceDashboard onNotify={showToast} />
          )}

          {section === "products" && (
            <ProductsSection
              products={visibleProducts}
              categories={categories}
              query={productQuery}
              setQuery={setProductQuery}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              onNew={openNewProduct}
              onEdit={openEditProduct}
              onDelete={setPendingDelete}
              onToggleStatus={toggleProductStatus}
            />
          )}

          {section === "featured" && (
            <FeaturedSection
              featured={featuredProducts}
              available={products.filter((product) => !product.isFeatured && product.status === "active")}
              onToggle={toggleFeatured}
              onMove={moveFeatured}
            />
          )}

          {section === "categories" && (
            <CategoriesSection
              categories={categories}
              products={products}
              onToggleVisibility={toggleCategoryVisibility}
              onMove={moveCategory}
            />
          )}

          {section === "store" && (
            <StoreSettingsSection
              settings={storeSettings}
              setSettings={setStoreSettings}
              saving={saving}
              onSave={saveStoreSettings}
            />
          )}
        </div>
      </div>

      {draft && (
        <ProductEditor
          draft={draft}
          setDraft={(updater) => setDraft((current) => (current ? updater(current) : current))}
          categories={categories}
          saving={saving}
          isNew={isNewProduct}
          onClose={() => setDraft(null)}
          onSave={saveProduct}
        />
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Confirmar exclusão">
          <div className="w-full max-w-md border border-white/10 bg-[#0a0a0a] p-7">
            <p className="eyebrow">Remover produto</p>
            <h2 className="mt-4 font-display text-3xl">Remover {pendingDelete.name}?</h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">Esta ação remove o produto da loja e não pode ser desfeita.</p>
            <div className="mt-8 flex justify-end gap-3">
              <button type="button" onClick={() => setPendingDelete(null)} className="admin-button-secondary">Cancelar</button>
              <button type="button" onClick={confirmDelete} className="admin-button-danger">Remover</button>
            </div>
          </div>
        </div>
      )}

      <div className={`fixed bottom-6 right-6 z-[120] border border-gold/25 bg-[#111] px-5 py-3 text-[11px] text-champagne shadow-2xl transition-all duration-500 ${toast ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`} role="status">
        {toast}
      </div>
    </main>
  );
}

function OverviewSection({ products, activeCount, featuredCount, lowStockProducts, onNavigate, onEdit, onNew }: { products: AdminProduct[]; activeCount: number; featuredCount: number; lowStockProducts: AdminProduct[]; onNavigate: (section: AdminSection) => void; onEdit: (product: AdminProduct) => void; onNew: () => void }) {
  const totalStock = products.reduce((total, product) => total + product.stock, 0);
  const draftCount = products.filter((product) => product.status === "draft").length;
  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Produtos cadastrados" value={String(products.length).padStart(2, "0")} detail={`${activeCount} publicados`} icon="products" />
        <MetricCard label="Unidades em estoque" value={String(totalStock)} detail="Somando todas as peças" icon="stock" />
        <MetricCard label="Produtos em destaque" value={String(featuredCount).padStart(2, "0")} detail="Na vitrine principal" icon="featured" />
        <MetricCard label="Atenção necessária" value={String(lowStockProducts.length + draftCount).padStart(2, "0")} detail={`${lowStockProducts.length} com estoque baixo`} icon="alert" warning />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <div className="admin-panel">
          <div className="admin-panel-header">
            <div><p className="admin-kicker">Estoque</p><h2 className="admin-title">Itens que pedem atenção</h2></div>
            <button type="button" onClick={() => onNavigate("products")} className="admin-text-button">Ver catálogo →</button>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {lowStockProducts.slice(0, 5).map((product) => (
              <button key={product.id} type="button" onClick={() => onEdit(product)} className="grid w-full grid-cols-[46px_1fr_auto] items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.025] md:px-6">
                <ProductThumb product={product} size="small" />
                <div className="min-w-0"><p className="truncate text-sm text-ink">{product.name}</p><p className="mt-1 text-[9px] tracking-[0.18em] text-ink-faint uppercase">{product.brand} · {product.category}</p></div>
                <span className="border border-amber-400/20 bg-amber-400/[0.07] px-2.5 py-1.5 text-[9px] text-amber-300">{product.stock} unidades</span>
              </button>
            ))}
            {lowStockProducts.length === 0 && <p className="px-6 py-10 text-center text-sm text-ink-muted">Nenhum alerta de estoque.</p>}
          </div>
        </div>

        <div className="admin-panel p-6">
          <p className="admin-kicker">Ações rápidas</p>
          <h2 className="admin-title mt-2">Gerencie sua loja</h2>
          <div className="mt-6 space-y-3">
            <QuickAction label="Adicionar novo produto" description="Cadastre uma peça ou fragrância" icon="plus" onClick={onNew} />
            <QuickAction label="Acompanhar financeiro" description="Receitas, despesas e fluxo de caixa" icon="finance" onClick={() => onNavigate("finance")} />
            <QuickAction label="Organizar destaques" description="Defina a ordem da vitrine" icon="featured" onClick={() => onNavigate("featured")} />
            <QuickAction label="Editar conteúdo da loja" description="Hero, avisos e contatos" icon="store" onClick={() => onNavigate("store")} />
          </div>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header"><div><p className="admin-kicker">Catálogo</p><h2 className="admin-title">Produtos recentes</h2></div></div>
        <div className="grid gap-px bg-white/[0.06] sm:grid-cols-2 xl:grid-cols-4">
          {products.slice(0, 4).map((product) => (
            <button key={product.id} type="button" onClick={() => onEdit(product)} className="flex items-center gap-4 bg-[#090909] p-5 text-left transition-colors hover:bg-[#0d0d0d]">
              <ProductThumb product={product} />
              <div className="min-w-0"><p className="truncate font-display text-lg">{product.name}</p><p className="mt-1 text-[9px] tracking-wider text-ink-faint uppercase">{formatStorePrice(product.price)}</p></div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProductsSection({ products, categories, query, setQuery, categoryFilter, setCategoryFilter, statusFilter, setStatusFilter, onNew, onEdit, onDelete, onToggleStatus }: { products: AdminProduct[]; categories: AdminCategory[]; query: string; setQuery: (value: string) => void; categoryFilter: string; setCategoryFilter: (value: string) => void; statusFilter: string; setStatusFilter: (value: string) => void; onNew: () => void; onEdit: (product: AdminProduct) => void; onDelete: (product: AdminProduct) => void; onToggleStatus: (id: string) => void }) {
  return (
    <section className="admin-panel overflow-hidden">
      <div className="flex flex-col gap-5 border-b border-white/[0.07] p-5 md:p-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <label className="relative flex-1"><span className="sr-only">Buscar produto</span><AdminIcon kind="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, marca ou categoria" className="admin-input pl-10" /></label>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="admin-select sm:w-48"><option>Todos</option>{categories.map((category) => <option key={category.id}>{category.name}</option>)}</select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="admin-select sm:w-40"><option value="all">Todos os status</option><option value="active">Publicado</option><option value="draft">Rascunho</option><option value="out-of-stock">Esgotado</option></select>
        </div>
        <button type="button" onClick={onNew} className="admin-button-primary shrink-0"><AdminIcon kind="plus" className="h-4 w-4" /> Novo produto</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse">
          <thead><tr className="border-b border-white/[0.07] text-left text-[8px] tracking-[0.25em] text-ink-faint uppercase"><th className="px-6 py-4 font-normal">Produto</th><th className="px-4 py-4 font-normal">Categoria</th><th className="px-4 py-4 font-normal">Preço</th><th className="px-4 py-4 font-normal">Estoque</th><th className="px-4 py-4 font-normal">Status</th><th className="px-4 py-4 font-normal">Destaque</th><th className="px-6 py-4 text-right font-normal">Ações</th></tr></thead>
          <tbody className="divide-y divide-white/[0.055]">
            {products.map((product) => (
              <tr key={product.id} className="transition-colors hover:bg-white/[0.018]">
                <td className="px-6 py-4"><div className="flex items-center gap-4"><ProductThumb product={product} size="small" /><div><p className="text-sm text-ink">{product.name}</p><p className="mt-1 text-[9px] tracking-[0.14em] text-ink-faint uppercase">{product.brand}</p></div></div></td>
                <td className="px-4 py-4 text-xs text-ink-muted">{product.category}</td>
                <td className="px-4 py-4">
                  {product.originalPrice && product.originalPrice > product.price ? (
                    <div>
                      <p className="text-[9px] text-ink-faint line-through">{formatStorePrice(product.originalPrice)}</p>
                      <p className="mt-0.5 text-xs text-gold">{formatStorePrice(product.price)}</p>
                      <span className="mt-1 inline-flex bg-gold/10 px-1.5 py-0.5 text-[7px] tracking-[0.16em] text-gold uppercase">Promo</span>
                    </div>
                  ) : (
                    <span className="text-xs text-champagne">{formatStorePrice(product.price)}</span>
                  )}
                </td>
                <td className="px-4 py-4"><span className={`text-xs ${product.stock <= 5 ? "text-amber-300" : "text-ink-muted"}`}>{product.stock}</span></td>
                <td className="px-4 py-4"><button type="button" onClick={() => onToggleStatus(product.id)}><StatusBadge status={product.status} /></button></td>
                <td className="px-4 py-4"><span className={`text-lg ${product.isFeatured ? "text-gold" : "text-ink-faint"}`}>{product.isFeatured ? "★" : "☆"}</span></td>
                <td className="px-6 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => onEdit(product)} className="admin-icon-button" aria-label={`Editar ${product.name}`}><AdminIcon kind="edit" className="h-4 w-4" /></button><button type="button" onClick={() => onDelete(product)} className="admin-icon-button hover:border-red-400/30 hover:text-red-300" aria-label={`Remover ${product.name}`}><AdminIcon kind="trash" className="h-4 w-4" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {products.length === 0 && <div className="px-6 py-20 text-center"><p className="font-display text-2xl">Nenhum produto encontrado.</p><p className="mt-2 text-sm text-ink-muted">Altere os filtros ou cadastre um novo item.</p></div>}
    </section>
  );
}

function FeaturedSection({ featured, available, onToggle, onMove }: { featured: AdminProduct[]; available: AdminProduct[]; onToggle: (id: string) => void; onMove: (id: string, direction: -1 | 1) => void }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <section className="admin-panel">
        <div className="admin-panel-header"><div><p className="admin-kicker">Ordem atual</p><h2 className="admin-title">Destaques da vitrine</h2><p className="mt-2 text-xs text-ink-muted">Os primeiros itens ganham maior prioridade na loja.</p></div><span className="text-[10px] text-ink-faint">{featured.length} selecionados</span></div>
        <div className="divide-y divide-white/[0.06]">
          {featured.map((product, index) => (
            <div key={product.id} className="grid grid-cols-[34px_56px_1fr_auto] items-center gap-4 px-5 py-4 md:px-6">
              <span className="font-display text-xl text-gold">{String(index + 1).padStart(2, "0")}</span><ProductThumb product={product} size="small" /><div className="min-w-0"><p className="truncate text-sm">{product.name}</p><p className="mt-1 text-[9px] text-ink-faint uppercase">{product.category}</p></div><div className="flex gap-1"><button type="button" onClick={() => onMove(product.id, -1)} disabled={index === 0} className="admin-icon-button disabled:opacity-20" aria-label="Mover para cima">↑</button><button type="button" onClick={() => onMove(product.id, 1)} disabled={index === featured.length - 1} className="admin-icon-button disabled:opacity-20" aria-label="Mover para baixo">↓</button><button type="button" onClick={() => onToggle(product.id)} className="admin-icon-button hover:text-red-300" aria-label="Remover dos destaques">×</button></div>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header"><div><p className="admin-kicker">Catálogo</p><h2 className="admin-title">Adicionar destaque</h2></div></div>
        <div className="max-h-[620px] divide-y divide-white/[0.06] overflow-y-auto">
          {available.map((product) => (
            <button key={product.id} type="button" onClick={() => onToggle(product.id)} className="grid w-full grid-cols-[46px_1fr_auto] items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.025] md:px-6"><ProductThumb product={product} size="small" /><div className="min-w-0"><p className="truncate text-sm">{product.name}</p><p className="mt-1 text-[9px] text-ink-faint uppercase">{product.brand}</p></div><span className="text-xl text-gold">＋</span></button>
          ))}
          {available.length === 0 && <p className="px-6 py-12 text-center text-sm text-ink-muted">Todos os produtos ativos estão em destaque.</p>}
        </div>
      </section>
    </div>
  );
}

function CategoriesSection({ categories, products, onToggleVisibility, onMove }: { categories: AdminCategory[]; products: AdminProduct[]; onToggleVisibility: (id: string) => void; onMove: (index: number, direction: -1 | 1) => void }) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-header"><div><p className="admin-kicker">Menu da loja</p><h2 className="admin-title">Categorias e ordem de exibição</h2><p className="mt-2 text-xs text-ink-muted">Controle quais categorias aparecem para o cliente.</p></div></div>
      <div className="grid gap-3 p-5 md:grid-cols-2 md:p-6 xl:grid-cols-3">
        {categories.map((category, index) => {
          const count = products.filter((product) => product.category === category.name).length;
          return (
            <div key={category.id} className={`border p-5 transition-colors ${category.visible ? "border-white/[0.08] bg-white/[0.018]" : "border-white/[0.04] opacity-50"}`}>
              <div className="flex items-start justify-between gap-4"><div><p className="font-display text-xl">{category.name}</p><p className="mt-2 text-[9px] tracking-[0.2em] text-ink-faint uppercase">{count} produtos</p></div><button type="button" onClick={() => onToggleVisibility(category.id)} className={`relative h-6 w-11 rounded-full transition-colors ${category.visible ? "bg-gold" : "bg-white/10"}`} aria-label={`${category.visible ? "Ocultar" : "Exibir"} ${category.name}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-black transition-transform ${category.visible ? "translate-x-6" : "translate-x-1"}`} /></button></div>
              <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4"><span className="text-[9px] text-ink-faint">POSIÇÃO {String(index + 1).padStart(2, "0")}</span><div className="flex gap-1"><button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} className="admin-icon-button disabled:opacity-20">↑</button><button type="button" onClick={() => onMove(index, 1)} disabled={index === categories.length - 1} className="admin-icon-button disabled:opacity-20">↓</button></div></div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StoreSettingsSection({ settings, setSettings, saving, onSave }: { settings: StoreSettings; setSettings: (settings: StoreSettings) => void; saving: boolean; onSave: () => void }) {
  function update<K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) { setSettings({ ...settings, [key]: value }); }
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <div className="space-y-6">
        <section className="admin-panel p-6"><p className="admin-kicker">Página da loja</p><h2 className="admin-title mt-2">Hero principal</h2><div className="mt-6 grid gap-5"><AdminField label="Chamada superior"><input value={settings.eyebrow} onChange={(e) => update("eyebrow", e.target.value)} className="admin-input" /></AdminField><AdminField label="Título"><input value={settings.title} onChange={(e) => update("title", e.target.value)} className="admin-input" /></AdminField><AdminField label="Descrição"><textarea value={settings.description} onChange={(e) => update("description", e.target.value)} className="admin-textarea" rows={3} /></AdminField><AdminField label="Caminho da imagem"><input value={settings.heroImage} onChange={(e) => update("heroImage", e.target.value)} className="admin-input" /></AdminField></div></section>
        <section className="admin-panel p-6"><div className="flex items-start justify-between gap-5"><div><p className="admin-kicker">Aviso promocional</p><h2 className="admin-title mt-2">Barra de anúncio</h2></div><button type="button" onClick={() => update("announcementEnabled", !settings.announcementEnabled)} className={`relative h-6 w-11 rounded-full transition-colors ${settings.announcementEnabled ? "bg-gold" : "bg-white/10"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-black transition-transform ${settings.announcementEnabled ? "translate-x-6" : "translate-x-1"}`} /></button></div><AdminField label="Texto do aviso" className="mt-6"><input value={settings.announcement} onChange={(e) => update("announcement", e.target.value)} className="admin-input" /></AdminField></section>
        <section className="admin-panel p-6"><p className="admin-kicker">Atendimento</p><h2 className="admin-title mt-2">Contato e loja física</h2><div className="mt-6 grid gap-5 md:grid-cols-2"><AdminField label="WhatsApp"><input value={settings.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder="(00) 00000-0000" className="admin-input" /></AdminField><AdminField label="Instagram"><input value={settings.instagram} onChange={(e) => update("instagram", e.target.value)} className="admin-input" /></AdminField><AdminField label="Endereço" className="md:col-span-2"><input value={settings.address} onChange={(e) => update("address", e.target.value)} className="admin-input" /></AdminField><AdminField label="Horário de funcionamento" className="md:col-span-2"><input value={settings.openingHours} onChange={(e) => update("openingHours", e.target.value)} className="admin-input" /></AdminField></div></section>
      </div>

      <div className="space-y-6">
        <section className="admin-panel overflow-hidden"><div className="relative aspect-[4/3] bg-surface-2"><Image src={safeImageSrc(settings.heroImage, getProductImagesPublicPrefixSafe())} alt="Prévia do hero" fill sizes="(min-width: 1280px) 35vw, 100vw" className="object-cover" /><div className="absolute inset-0 bg-black/50" /><div className="absolute inset-x-6 bottom-6"><p className="text-[8px] tracking-[0.25em] text-gold uppercase">{settings.eyebrow}</p><p className="mt-2 font-display text-4xl leading-none">{settings.title}</p></div></div><div className="p-5"><p className="text-[9px] tracking-[0.25em] text-ink-faint uppercase">Prévia da vitrine</p></div></section>
        <section className="admin-panel p-6"><p className="admin-kicker">Busca e compartilhamento</p><h2 className="admin-title mt-2">SEO básico</h2><div className="mt-6 grid gap-5"><AdminField label="Título da página"><input value={settings.seoTitle} onChange={(e) => update("seoTitle", e.target.value)} className="admin-input" /></AdminField><AdminField label="Descrição"><textarea value={settings.seoDescription} onChange={(e) => update("seoDescription", e.target.value)} className="admin-textarea" rows={4} /></AdminField></div></section>
        <button type="button" onClick={onSave} disabled={saving} className="admin-button-primary w-full justify-center py-4 disabled:cursor-not-allowed disabled:opacity-40">{saving ? "Salvando…" : "Salvar configurações"}</button>
      </div>
    </div>
  );
}

function ProductEditor({ draft, setDraft, categories, saving, isNew, onClose, onSave }: { draft: AdminProduct; setDraft: (updater: (product: AdminProduct) => AdminProduct) => void; categories: AdminCategory[]; saving: boolean; isNew: boolean; onClose: () => void; onSave: () => void }) {
  // Atualização funcional: o upload de imagem termina depois de um await e não pode
  // sobrescrever edições feitas em outros campos nesse intervalo.
  function update<K extends keyof AdminProduct>(key: K, value: AdminProduct[K]) { setDraft((current) => ({ ...current, [key]: value })); }
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  // O preview nunca recebe um src que o next/image não consiga renderizar (host não autorizado lança erro).
  const previewSrc = safeImageSrc(draft.image, getProductImagesPublicPrefixSafe());

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const extension = UPLOAD_EXTENSIONS[file.type];
    if (!extension) { setUploadError("Use uma imagem JPG, PNG, WebP ou AVIF."); return; }
    if (file.size > UPLOAD_MAX_BYTES) { setUploadError("A imagem precisa ter até 5 MB."); return; }

    setUploading(true);
    setUploadError("");
    try {
      const supabase = createClient();
      const path = `products/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      update("image", data.publicUrl);
    } catch {
      setUploadError("Não foi possível enviar a imagem. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  const promotionEnabled = draft.originalPrice !== undefined;
  const promotionInvalid = promotionEnabled && draft.originalPrice! <= draft.price;
  const discount = promotionEnabled && !promotionInvalid
    ? Math.round((1 - draft.price / draft.originalPrice!) * 100)
    : 0;
  return (
    <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={isNew ? "Novo produto" : `Editar ${draft.name}`}>
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Fechar editor" />
      <aside className="absolute right-0 top-0 z-10 flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-[#090909]">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-5"><div><p className="admin-kicker">{isNew ? "Cadastro" : "Catálogo"}</p><h2 className="mt-1 font-display text-2xl">{isNew ? "Novo produto" : "Editar produto"}</h2></div><button type="button" onClick={onClose} className="admin-icon-button" aria-label="Fechar"><AdminIcon kind="close" className="h-5 w-5" /></button></div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="relative mb-6 aspect-[16/8] overflow-hidden border border-white/[0.07] bg-[#0d0d0d]"><Image src={previewSrc} alt="Prévia do produto" fill sizes="576px" className={draft.imageFit === "contain" ? "object-contain p-8" : "object-cover"} /></div>
          <div className="-mt-3 mb-6 flex flex-wrap items-center gap-3">
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={handleFile} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="admin-button-secondary disabled:cursor-not-allowed disabled:opacity-40">{uploading ? "Enviando…" : "Enviar imagem"}</button>
            <span className="text-[10px] text-ink-faint">JPG, PNG, WebP ou AVIF · até 5 MB</span>
            {uploadError && <p role="alert" className="w-full text-[10px] text-red-300">{uploadError}</p>}
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <AdminField label="Nome do produto" className="md:col-span-2"><input value={draft.name} onChange={(e) => update("name", e.target.value)} className="admin-input" placeholder="Nome do produto" /></AdminField>
            <AdminField label="Marca"><input value={draft.brand} onChange={(e) => update("brand", e.target.value)} className="admin-input" /></AdminField>
            <AdminField label="Categoria"><select value={draft.category} onChange={(e) => update("category", e.target.value)} className="admin-select w-full">{categories.map((category) => <option key={category.id}>{category.name}</option>)}</select></AdminField>
            <AdminField label="Preço de venda"><input type="number" min="0" step="0.01" value={draft.price} onChange={(e) => update("price", Number(e.target.value))} className="admin-input" /></AdminField>
            <AdminField label="Estoque"><input type="number" min="0" value={draft.stock} onChange={(e) => update("stock", Number(e.target.value))} className="admin-input" /></AdminField>
            <AdminField label="Status"><select value={draft.status} onChange={(e) => update("status", e.target.value as ProductStatus)} className="admin-select w-full"><option value="active">Publicado</option><option value="draft">Rascunho</option><option value="out-of-stock">Esgotado</option></select></AdminField>
            <AdminField label="Selo"><select value={draft.badge ?? ""} onChange={(e) => update("badge", (e.target.value || undefined) as StoreBadge | undefined)} className="admin-select w-full"><option value="">Sem selo</option><option>Novo</option><option>Últimas peças</option><option>Esgotado</option></select></AdminField>
            <label className="flex cursor-pointer items-center justify-between border border-gold/15 bg-gold/[0.025] p-4 md:col-span-2"><div><p className="text-xs text-ink">Produto em promoção</p><p className="mt-1 text-[10px] text-ink-faint">Exibir no carrossel promocional com o preço anterior riscado</p></div><input type="checkbox" checked={promotionEnabled} onChange={(e) => update("originalPrice", e.target.checked ? Number(Math.max(draft.price * 1.2, draft.price + 1).toFixed(2)) : undefined)} className="h-4 w-4 accent-[#c8a45d]" /></label>
            {promotionEnabled && (
              <>
                <AdminField label="Preço anterior"><input type="number" min={draft.price + 0.01} step="0.01" value={draft.originalPrice ?? ""} onChange={(e) => update("originalPrice", e.target.value === "" ? undefined : Number(e.target.value))} className={`admin-input ${promotionInvalid ? "border-red-400/60" : ""}`} /></AdminField>
                <div className="flex items-center justify-between border border-white/[0.07] px-4 py-3"><div><p className="text-[8px] tracking-[0.2em] text-ink-faint uppercase">Desconto exibido</p><p className={`mt-1 font-display text-2xl ${promotionInvalid ? "text-red-300" : "text-gold"}`}>{promotionInvalid ? "Inválido" : `${discount}%`}</p></div><span className="bg-gold px-2.5 py-1.5 text-[7px] tracking-[0.2em] text-black uppercase">Em promoção</span></div>
                {promotionInvalid && <p className="-mt-2 text-[10px] text-red-300 md:col-span-2">O preço anterior precisa ser maior que o preço de venda.</p>}
              </>
            )}
            <AdminField label="Tamanhos / volumes" className="md:col-span-2"><input value={draft.sizes.join(", ")} onChange={(e) => update("sizes", e.target.value.split(",").map((item) => item.trim()).filter(Boolean))} className="admin-input" placeholder="P, M, G ou 100 ml" /></AdminField>
            <AdminField label="Caminho da imagem" className="md:col-span-2"><input value={draft.image} onChange={(e) => update("image", e.target.value)} className="admin-input" /></AdminField>
            <AdminField label="Descrição" className="md:col-span-2"><textarea value={draft.description} onChange={(e) => update("description", e.target.value)} className="admin-textarea" rows={4} /></AdminField>
            <label className="flex cursor-pointer items-center justify-between border border-white/[0.07] p-4 md:col-span-2"><div><p className="text-xs text-ink">Produto em destaque</p><p className="mt-1 text-[10px] text-ink-faint">Exibir com prioridade na vitrine</p></div><input type="checkbox" checked={draft.isFeatured} onChange={(e) => update("isFeatured", e.target.checked)} className="h-4 w-4 accent-[#c8a45d]" /></label>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-white/[0.07] p-5"><button type="button" onClick={onClose} className="admin-button-secondary">Cancelar</button><button type="button" onClick={onSave} disabled={saving || uploading || !draft.name.trim() || !draft.brand.trim() || promotionInvalid} className="admin-button-primary disabled:cursor-not-allowed disabled:opacity-40">{saving ? "Salvando…" : isNew ? "Criar produto" : "Salvar alterações"}</button></div>
      </aside>
    </div>
  );
}

function MetricCard({ label, value, detail, icon, warning = false }: { label: string; value: string; detail: string; icon: AdminIconKind; warning?: boolean }) {
  return <div className="admin-panel p-5 md:p-6"><div className="flex items-start justify-between"><div><p className="text-[8px] tracking-[0.25em] text-ink-faint uppercase">{label}</p><p className="mt-4 font-display text-4xl text-champagne md:text-5xl">{value}</p></div><span className={`flex h-10 w-10 items-center justify-center border ${warning ? "border-amber-400/20 bg-amber-400/[0.06] text-amber-300" : "border-gold/15 bg-gold/[0.04] text-gold"}`}><AdminIcon kind={icon} className="h-[18px] w-[18px]" /></span></div><p className="mt-4 border-t border-white/[0.06] pt-3 text-[10px] text-ink-muted">{detail}</p></div>;
}

function QuickAction({ label, description, icon, onClick }: { label: string; description: string; icon: AdminIconKind; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex w-full items-center gap-4 border border-white/[0.07] p-4 text-left transition-colors hover:border-gold/25 hover:bg-gold/[0.03]"><span className="flex h-9 w-9 shrink-0 items-center justify-center bg-white/[0.035] text-gold"><AdminIcon kind={icon} className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs text-ink">{label}</span><span className="mt-1 block text-[10px] text-ink-faint">{description}</span></span><span className="text-gold">→</span></button>;
}

function ProductThumb({ product, size = "normal" }: { product: AdminProduct; size?: "small" | "normal" }) {
  const dimensions = size === "small" ? "h-12 w-12" : "h-14 w-14";
  return <span className={`relative block shrink-0 overflow-hidden bg-[#111] ${dimensions}`}><Image src={product.image} alt="" fill sizes="56px" className={product.imageFit === "contain" ? "object-contain p-1.5" : "object-cover"} style={{ objectPosition: product.imagePosition ?? "50% 45%" }} /></span>;
}

function StatusBadge({ status }: { status: ProductStatus }) {
  const config = status === "active" ? ["Publicado", "bg-emerald-400/[0.08] text-emerald-300 border-emerald-400/15"] : status === "draft" ? ["Rascunho", "bg-white/[0.04] text-ink-muted border-white/10"] : ["Esgotado", "bg-red-400/[0.07] text-red-300 border-red-400/15"];
  return <span className={`inline-flex border px-2.5 py-1.5 text-[8px] tracking-[0.15em] uppercase ${config[1]}`}>{config[0]}</span>;
}

function AdminField({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block ${className}`}><span className="mb-2 block text-[8px] tracking-[0.22em] text-ink-faint uppercase">{label}</span>{children}</label>;
}

type AdminIconKind = AdminSection | "menu" | "close" | "search" | "edit" | "trash" | "plus" | "stock" | "alert";
function AdminIcon({ kind, className }: { kind: AdminIconKind; className?: string }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, className, "aria-hidden": true } as const;
  if (kind === "overview") return <svg {...common}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>;
  if (kind === "finance") return <svg {...common}><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /><path d="m3 7 6-4 6 5 6-4" /></svg>;
  if (kind === "products" || kind === "stock") return <svg {...common}><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="m4 7 8 4 8-4v10l-8 4-8-4V7Z" /></svg>;
  if (kind === "featured") return <svg {...common}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></svg>;
  if (kind === "categories") return <svg {...common}><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="7" cy="6" r="1.5" fill="currentColor" /><circle cx="15" cy="12" r="1.5" fill="currentColor" /><circle cx="10" cy="18" r="1.5" fill="currentColor" /></svg>;
  if (kind === "store") return <svg {...common}><path d="M4 9h16l-1-5H5L4 9Z" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></svg>;
  if (kind === "menu") return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
  if (kind === "close") return <svg {...common}><path d="m5 5 14 14M19 5 5 19" /></svg>;
  if (kind === "search") return <svg {...common}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>;
  if (kind === "edit") return <svg {...common}><path d="m4 20 4.5-1 10-10-3.5-3.5-10 10L4 20Z" /><path d="m13.5 7 3.5 3.5" /></svg>;
  if (kind === "trash") return <svg {...common}><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" /></svg>;
  if (kind === "plus") return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
  return <svg {...common}><path d="M12 9v4M12 17h.01" /><path d="M10.3 4.6 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z" /></svg>;
}
