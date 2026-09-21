// Testes unitários da lógica de negócio que roda no Node (npm test).
// Cobrem: mensagem/URL do WhatsApp, validação de entradas do painel, mapeadores e guarda de chave.

import assert from "node:assert/strict";
import test from "node:test";
import { assertPublishableKey } from "../lib/supabase/key-guard.ts";
import {
  BADGE_FROM_DB,
  FALLBACK_IMAGE,
  safeImageSrc,
  toAdminProduct,
  toStoreProduct,
  toStoreSettings,
} from "../lib/store/mappers.ts";
import {
  BADGE_TO_DB,
  isAllowedImageSrc,
  isUuid,
  parseProductInput,
  parseStoreSettingsInput,
  slugify,
  toProductRow,
} from "../lib/store/validation.ts";
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  cartTotalCents,
  DEFAULT_WHATSAPP_E164,
  resolveWhatsappNumber,
  whatsappDigits,
} from "../lib/store/whatsapp.ts";

const STORAGE = "https://abc123.supabase.co/storage/v1/object/public/product-images/";
const CATEGORY_ID = "11111111-1111-4111-8111-111111111111";

const LINES = [
  { name: "Camisa Signature", brand: "Zara", category: "Camisas", size: "M", quantity: 2, unitPrice: 239.9 },
  { name: "Asad", brand: "Lattafa", category: "Perfumes", size: "100 ml", quantity: 1, unitPrice: 249.9 },
];

// ---------------------------------------------------------------- WhatsApp
test("mensagem do pedido traz produtos, tamanho/volume, quantidades, subtotais e total estimado", () => {
  const message = buildWhatsAppMessage(LINES);
  assert.match(message, /1\. Camisa Signature — Zara/);
  assert.match(message, /Tamanho: M/);
  assert.match(message, /2 × R\$ 239,90 = R\$ 479,80/);
  assert.match(message, /2\. Asad — Lattafa/);
  assert.match(message, /Volume: 100 ml/);
  assert.match(message, /1 × R\$ 249,90 = R\$ 249,90/);
  assert.match(message, /Total estimado: R\$ 729,70/);
  assert.ok(!message.includes(" "), "NBSP deve ser normalizado");
});

test("total é calculado em centavos (sem erro de ponto flutuante)", () => {
  // 0.1 * 3 em float = 0.30000000000000004
  assert.equal(cartTotalCents([{ ...LINES[0], unitPrice: 0.1, quantity: 3 }]), 30);
  assert.equal(cartTotalCents(LINES), 72970);
  assert.equal(cartTotalCents([]), 0);
});

test("URL do WhatsApp aponta para wa.me com o texto codificado", () => {
  const url = buildWhatsAppUrl("558388933979", LINES);
  assert.ok(url.startsWith("https://wa.me/558388933979?text="));
  const text = decodeURIComponent(url.split("?text=")[1]);
  assert.equal(text, buildWhatsAppMessage(LINES));
});

test("sacola enorme cai para o formato compacto e ainda preserva o total", () => {
  const many = Array.from({ length: 60 }, (_, i) => ({
    name: `Produto com nome bem comprido número ${i + 1}`,
    brand: "Marca Exemplo",
    category: "Camisas",
    size: "GG",
    quantity: 3,
    unitPrice: 199.9,
  }));
  const url = buildWhatsAppUrl("558388933979", many);
  const text = decodeURIComponent(url.split("?text=")[1]);
  assert.match(text, /Total estimado: R\$ 35\.982,00/);
  assert.ok(text.length < buildWhatsAppMessage(many).length, "deveria usar o formato compacto");
});

test("número do WhatsApp: normaliza, valida e cai no padrão da loja", () => {
  assert.equal(whatsappDigits("+55 (83) 8893-3979"), "558388933979");
  assert.equal(whatsappDigits("(83) 98893-3979"), "5583988933979");
  assert.equal(whatsappDigits("8388933979"), "558388933979");
  assert.equal(whatsappDigits("123"), null);
  assert.equal(whatsappDigits(""), null);
  assert.equal(resolveWhatsappNumber(""), DEFAULT_WHATSAPP_E164);
  assert.equal(resolveWhatsappNumber(undefined), DEFAULT_WHATSAPP_E164);
  assert.equal(resolveWhatsappNumber("abc"), DEFAULT_WHATSAPP_E164);
  assert.equal(resolveWhatsappNumber("+55 (83) 8893-3979"), "558388933979");
  assert.equal(DEFAULT_WHATSAPP_E164, "558388933979");
});

// ---------------------------------------------------------------- Validação
const validInput = (overrides = {}) => ({
  brand: "Zara",
  name: "Camisa Signature",
  description: "Corte limpo.",
  categoryId: CATEGORY_ID,
  price: 239.9,
  originalPrice: null,
  image: "/images/store/xavier-category-clothing.webp",
  colors: [{ name: "Preto", hex: "#171717" }],
  sizes: ["P", "M"],
  badge: "Novo",
  status: "active",
  stock: 5,
  isFeatured: false,
  ...overrides,
});

test("produto válido é aceito e vira payload de banco com badge normalizado", () => {
  const parsed = parseProductInput(validInput(), STORAGE);
  assert.equal(parsed.ok, true);
  const row = toProductRow(parsed.value);
  assert.equal(row.badge, "novo");
  assert.equal(row.category_id, CATEGORY_ID);
  assert.equal(row.price, 239.9);
  assert.deepEqual(row.sizes, ["P", "M"]);
});

test("BADGE_TO_DB e BADGE_FROM_DB são inversos", () => {
  for (const [label, key] of Object.entries(BADGE_TO_DB)) assert.equal(BADGE_FROM_DB[key], label);
  assert.equal(Object.keys(BADGE_TO_DB).length, Object.keys(BADGE_FROM_DB).length);
});

test("entradas inválidas do produto são rejeitadas com mensagem", () => {
  const rejects = (overrides, pattern) => {
    const parsed = parseProductInput(validInput(overrides), STORAGE);
    assert.equal(parsed.ok, false, JSON.stringify(overrides));
    assert.match(parsed.error, pattern);
  };
  rejects({ name: "   " }, /Nome do produto/);
  rejects({ brand: "" }, /Marca/);
  rejects({ categoryId: "nao-e-uuid" }, /categoria/i);
  rejects({ price: -1 }, /preço/i);
  rejects({ price: "abc" }, /preço/i);
  rejects({ price: 100, originalPrice: 100 }, /preço anterior/i);
  rejects({ price: 100, originalPrice: 50 }, /preço anterior/i);
  rejects({ image: "https://evil.example/x.png" }, /Imagem inválida/);
  rejects({ image: "javascript:alert(1)" }, /Imagem inválida/);
  rejects({ image: "//evil.example/x.png" }, /Imagem inválida/);
  rejects({ image: "/images/../../etc/passwd" }, /Imagem inválida/);
  rejects({ image: "/videos/a.mp4" }, /Imagem inválida/);
  rejects({ status: "published" }, /Status/);
  rejects({ badge: "Promoção" }, /Selo/);
  rejects({ stock: -3 }, /estoque/i);
  rejects({ imagePosition: "url(x)" }, /Posição/);
  rejects({ id: "123" }, /Identificador/);
  rejects({ name: "x".repeat(161) }, /excede 160/);
  assert.equal(parseProductInput(null, STORAGE).ok, false);
  assert.equal(parseProductInput("texto", STORAGE).ok, false);
});

test("normalizações: preço 2 casas, estoque inteiro, tamanhos únicos/aparados, cores inválidas descartadas", () => {
  const parsed = parseProductInput(
    validInput({
      price: 10.005,
      stock: 7.9,
      sizes: [" P ", "P", "", "M"],
      colors: [{ name: "Ok", hex: "#ffffff" }, { name: "Ruim", hex: "red" }, "lixo", { name: "", hex: "#000000" }],
    }),
    STORAGE,
  );
  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.price, 10.01);
  assert.equal(parsed.value.stock, 7);
  assert.deepEqual(parsed.value.sizes, ["P", "M"]);
  assert.deepEqual(parsed.value.colors, [{ name: "Ok", hex: "#ffffff" }]);
});

test("tamanhos vazios viram ['Único'] (o banco exige ao menos um)", () => {
  const parsed = parseProductInput(validInput({ sizes: [] }), STORAGE);
  assert.deepEqual(parsed.value.sizes, ["Único"]);
});

test("imagem do bucket é aceita; query string e outro host não", () => {
  assert.equal(isAllowedImageSrc(`${STORAGE}products/a.webp`, STORAGE), true);
  assert.equal(isAllowedImageSrc(`${STORAGE}products/a.webp?v=2`, STORAGE), false);
  assert.equal(isAllowedImageSrc("https://outro.supabase.co/storage/v1/object/public/product-images/a.webp", STORAGE), false);
  assert.equal(isAllowedImageSrc("/images/roupas/zara/Captura de tela 2026-09-17 144308.webp", STORAGE), true);
});

test("prefixo vazio (env ausente) NÃO autoriza nenhum host remoto", () => {
  const remote = "https://evil.example/x.png";
  assert.equal(isAllowedImageSrc(remote, ""), false);
  assert.equal(safeImageSrc(remote, ""), FALLBACK_IMAGE);
  // caminhos locais continuam funcionando sem env
  assert.equal(isAllowedImageSrc("/images/a.webp", ""), true);
  assert.equal(safeImageSrc("/images/a.webp", ""), "/images/a.webp");
});

test("configuração da vitrine: valida WhatsApp, título e imagem", () => {
  const base = {
    eyebrow: "Xavier Store", title: "Vista sua presença.", description: "d",
    heroImage: "/images/store/xavier-category-clothing.webp",
    announcementEnabled: false, announcement: "", whatsapp: "+55 (83) 8893-3979",
    instagram: "@x", address: "a", openingHours: "h", seoTitle: "t", seoDescription: "d",
  };
  assert.equal(parseStoreSettingsInput(base, STORAGE).ok, true);
  assert.equal(parseStoreSettingsInput({ ...base, whatsapp: "" }, STORAGE).ok, true);
  assert.equal(parseStoreSettingsInput({ ...base, whatsapp: "123" }, STORAGE).ok, false);
  assert.equal(parseStoreSettingsInput({ ...base, title: "  " }, STORAGE).ok, false);
  assert.equal(parseStoreSettingsInput({ ...base, heroImage: "data:image/png;base64,AAAA" }, STORAGE).ok, false);
  assert.equal(parseStoreSettingsInput({ ...base, seoDescription: "x".repeat(321) }, STORAGE).ok, false);
});

test("slugify gera slugs válidos para o CHECK do banco", () => {
  const valid = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  for (const text of ["Zara Camisa Signature", "Chapéus e bonés", "  --Óculos Onyx!!  ", "212 VIP Black"]) {
    assert.match(slugify(text), valid, text);
  }
  assert.equal(slugify("Chapéus e bonés"), "chapeus-e-bones");
  assert.equal(slugify("!!!"), "");
  assert.ok(slugify("a".repeat(300)).length <= 100);
});

test("isUuid", () => {
  assert.equal(isUuid(CATEGORY_ID), true);
  assert.equal(isUuid("abc"), false);
  assert.equal(isUuid(undefined), false);
});

// ---------------------------------------------------------------- Mapeadores
const row = (overrides = {}) => ({
  id: "22222222-2222-4222-8222-222222222222",
  slug: "zara-camisa-signature",
  brand: "Zara",
  name: "Camisa Signature",
  description: "Corte limpo.",
  category_id: CATEGORY_ID,
  price: "239.90",
  original_price: null,
  image_url: "/images/store/xavier-category-clothing.webp",
  image_position: "30% 82%",
  image_fit: "contain",
  colors: [{ name: "Preto", hex: "#171717" }],
  sizes: ["P", "M"],
  badge: "ultimas-pecas",
  status: "active",
  is_featured: true,
  featured_rank: 3,
  stock: 12,
  ...overrides,
});

test("mapper público converte numeric em number e badge do banco para o rótulo da UI", () => {
  const product = toStoreProduct(row({ original_price: 300 }), "Camisas", STORAGE);
  assert.equal(product.price, 239.9);
  assert.equal(product.originalPrice, 300);
  assert.equal(product.badge, "Últimas peças");
  assert.equal(product.imageFit, "contain");
  assert.equal(product.imagePosition, "30% 82%");
  assert.equal(product.featured, 3);
  assert.equal("stock" in product, false, "estoque não deve vazar para a loja");
});

test("status out-of-stock aparece como selo Esgotado na loja, mas o painel mantém o valor real", () => {
  const sold = row({ status: "out-of-stock", badge: null });
  assert.equal(toStoreProduct(sold, "Camisas", STORAGE).badge, "Esgotado");
  const admin = toAdminProduct(sold, "Camisas", STORAGE);
  assert.equal(admin.badge, undefined);
  assert.equal(admin.status, "out-of-stock");
  assert.equal(admin.stock, 12);
  assert.equal(admin.isFeatured, true);
});

test("linha ruim não derruba a loja: imagem inválida vira fallback, tamanhos/cores vazios têm padrão", () => {
  const bad = toStoreProduct(row({ image_url: "https://evil.example/x.png", sizes: [], colors: "lixo" }), "Camisas", STORAGE);
  assert.equal(bad.image, FALLBACK_IMAGE);
  assert.deepEqual(bad.sizes, ["Único"]);
  assert.deepEqual(bad.colors, []);
  assert.equal(safeImageSrc(null, STORAGE), FALLBACK_IMAGE);
  assert.equal(safeImageSrc(`${STORAGE}products/a.webp`, STORAGE), `${STORAGE}products/a.webp`);
  assert.equal(safeImageSrc("/images/a b.webp?x=1", STORAGE), FALLBACK_IMAGE);
});

test("toStoreSettings usa padrões quando a linha não existe", () => {
  const settings = toStoreSettings(null);
  assert.equal(settings.title, "Vista sua presença.");
  assert.equal(settings.announcementEnabled, false);
});

// ---------------------------------------------------------------- Guarda de chave
test("guarda impede chave secreta em variável pública", () => {
  const jwt = (role) => {
    const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
    return `${b64({ alg: "HS256" })}.${b64({ role })}.assinatura`;
  };
  assert.throws(() => assertPublishableKey("sb_secret_abcdef"), /SECRETA/);
  assert.throws(() => assertPublishableKey(jwt("service_role")), /SECRETA/);
  assert.doesNotThrow(() => assertPublishableKey("sb_publishable_abcdef"));
  assert.doesNotThrow(() => assertPublishableKey(jwt("anon")));
});
