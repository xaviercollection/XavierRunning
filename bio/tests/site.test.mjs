// Testes da configuração da bio (npm test). Garantem o conteúdo combinado com a marca, a ordem dos
// botões e que cada link ou ainda é placeholder ou está no formato certo — nunca um link quebrado.

import assert from "node:assert/strict";
import test from "node:test";
import { ACTIONS, COPY, LINKS, PLACEHOLDER, SITE_URL, auditLinks, isPlaceholder } from "../config/site.ts";

test("textos da marca são exatamente os aprovados", () => {
  assert.deepEqual(COPY, {
    brand: "Xavier Collection",
    slogan: "Vista sua presença.",
    support: "Moda masculina, perfumaria e lifestyle.",
    footer: "Curated in Brazil · XC 2026",
  });
});

test("domínio da bio é o domínio principal", () => {
  assert.equal(SITE_URL, "https://xaviercollection.com.br");
});

test("quatro botões, na ordem combinada, apontando para LINKS", () => {
  assert.deepEqual(
    ACTIONS.map((action) => action.label),
    ["Explorar a loja", "WhatsApp", "Instagram", "Visitar a loja"],
  );
  for (const action of ACTIONS) assert.equal(action.href, LINKS[action.id]);
});

test("Explorar a loja leva à loja atual, na mesma aba", () => {
  const store = ACTIONS[0];
  assert.equal(store.href, "https://loja.xaviercollection.com.br/");
  assert.equal(store.external, false);
  assert.ok(ACTIONS.slice(1).every((action) => action.external));
});

test("links atuais: placeholder explícito ou formato válido", () => {
  const { invalid } = auditLinks();
  assert.deepEqual(invalid, []);
  assert.ok(!isPlaceholder(LINKS.store));
});

test("auditLinks separa placeholder de link mal preenchido", () => {
  assert.deepEqual(
    auditLinks({
      store: "https://loja.xaviercollection.com.br/",
      whatsapp: `https://wa.me/${PLACEHOLDER}_NUMERO_WHATSAPP`,
      instagram: "https://www.instagram.com/xavier/",
      location: `https://www.google.com/maps/search/?api=1&query=${PLACEHOLDER}_ENDERECO_DA_LOJA`,
    }),
    { pending: ["whatsapp", "location"], invalid: [] },
  );

  const typos = auditLinks({
    store: "https://xaviercollection.com.br/",
    whatsapp: "wa.me/5583999999999",
    instagram: "https://instagram.com/",
    location: "https://example.com/maps",
  });
  assert.deepEqual(typos, { pending: [], invalid: ["store", "whatsapp", "instagram", "location"] });
});

test("formatos aceitos para os links reais", () => {
  const ok = auditLinks({
    store: "https://loja.xaviercollection.com.br/",
    whatsapp: "https://wa.me/5583999999999?text=Ol%C3%A1",
    instagram: "https://www.instagram.com/xavier.collection",
    location: "https://maps.app.goo.gl/AbCdEf123",
  });
  assert.deepEqual(ok, { pending: [], invalid: [] });

  assert.deepEqual(auditLinks({ ...LINKS, location: "https://www.google.com/maps/place/Loja" }).invalid, []);
  assert.deepEqual(auditLinks({ ...LINKS, location: "https://www.google.com.br/maps?q=Loja" }).invalid, []);
});
