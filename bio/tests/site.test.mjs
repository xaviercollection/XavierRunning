// Testes da configuração da bio (npm test). Garantem o conteúdo combinado com a marca, a ordem dos
// botões e que os quatro apontam para os destinos reais, em formato válido — nunca um link quebrado.

import assert from "node:assert/strict";
import test from "node:test";
import { ACTIONS, COPY, LINKS, SITE_URL, invalidLinks } from "../config/site.ts";

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

test("quatro botões, na ordem combinada, cada um com seu destino real", () => {
  assert.deepEqual(
    ACTIONS.map(({ id, label, href }) => ({ id, label, href })),
    [
      { id: "store", label: "Explorar a loja", href: "https://loja.xaviercollection.com.br/" },
      { id: "whatsapp", label: "WhatsApp", href: "https://wa.me/558388933979" },
      { id: "instagram", label: "Instagram", href: "https://www.instagram.com/xaviercollection2/" },
      { id: "location", label: "Visitar a loja", href: "https://maps.google.com/?q=Rua+Solon+de+Lucena+26+Arara" },
    ],
  );
  for (const action of ACTIONS) assert.equal(action.href, LINKS[action.id]);
});

test("todos os links são válidos: https, formato certo e sem marcador de placeholder", () => {
  assert.deepEqual(invalidLinks(), []);
  for (const action of ACTIONS) {
    const url = new URL(action.href);
    assert.equal(url.protocol, "https:", action.id);
    assert.doesNotMatch(action.href, /SUBSTITUIR|PLACEHOLDER|TODO|example\.com/i, action.id);
  }
  assert.equal(new URL(LINKS.whatsapp).pathname, "/558388933979");
  assert.equal(new URL(LINKS.instagram).pathname, "/xaviercollection2/");
  assert.equal(new URL(LINKS.location).searchParams.get("q"), "Rua Solon de Lucena 26 Arara");
});

test("loja abre na mesma aba; WhatsApp, Instagram e mapa abrem em nova aba", () => {
  assert.deepEqual(
    ACTIONS.map((action) => [action.id, action.external]),
    [
      ["store", false],
      ["whatsapp", true],
      ["instagram", true],
      ["location", true],
    ],
  );
});

test("invalidLinks rejeita link mal preenchido", () => {
  assert.deepEqual(
    invalidLinks({
      store: "https://xaviercollection.com.br/",
      whatsapp: "wa.me/558388933979",
      instagram: "https://instagram.com/",
      location: "https://example.com/maps",
    }),
    ["store", "whatsapp", "instagram", "location"],
  );
  assert.deepEqual(invalidLinks({ ...LINKS, whatsapp: "https://wa.me/8388933979" }), ["whatsapp"]);
  assert.deepEqual(invalidLinks({ ...LINKS, whatsapp: "https://wa.me/SUBSTITUIR_NUMERO_WHATSAPP" }), ["whatsapp"]);
});

test("invalidLinks aceita os outros formatos comuns de cada destino", () => {
  assert.deepEqual(
    invalidLinks({
      store: "https://loja.xaviercollection.com.br/",
      whatsapp: "https://wa.me/558388933979?text=Ol%C3%A1",
      instagram: "https://instagram.com/xaviercollection2",
      location: "https://maps.app.goo.gl/AbCdEf123",
    }),
    [],
  );
  assert.deepEqual(invalidLinks({ ...LINKS, location: "https://www.google.com/maps/place/Loja" }), []);
  assert.deepEqual(invalidLinks({ ...LINKS, location: "https://www.google.com.br/maps?q=Loja" }), []);
});
