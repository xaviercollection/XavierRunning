-- Xavier Collection — catálogo inicial (GERADO por scripts/generate-seed-migration.mjs
-- a partir de lib/storeCatalog.ts; não edite à mão — regenere com `npm run db:seed:generate`).
--
-- Idempotente: reexecutar não sobrescreve nada do que o lojista editou no painel.
-- Os valores de estoque abaixo são ilustrativos (herdados do protótipo): ajuste no painel.

insert into public.categories (name, slug, sort_order)
values
  ('Perfumes', 'perfumes', 0),
  ('Camisas', 'camisas', 1),
  ('Casacos', 'casacos', 2),
  ('Chapéus e bonés', 'chapeus-e-bones', 3),
  ('Óculos', 'oculos', 4),
  ('Sapatos', 'sapatos', 5),
  ('Calças', 'calcas', 6),
  ('Shorts', 'shorts', 7),
  ('Roupas de academia', 'roupas-de-academia', 8)
on conflict (slug) do nothing;

insert into public.products (
  slug, brand, name, description, category_id,
  price, original_price,
  image_url, image_position, image_fit,
  colors, sizes, badge, status,
  stock, is_featured, featured_rank, created_at
)
select
  v.slug, v.brand, v.name, v.description, c.id,
  v.price, v.original_price,
  v.image_url, v.image_position, v.image_fit,
  v.colors, v.sizes, v.badge, v.status,
  v.stock, v.is_featured, v.featured_rank, v.created_at
from (
  values
  ('zara-camisa-signature', 'Zara', 'Camisa Signature', 'Corte limpo, toque macio e presença sem excesso.', 'camisas', 239.90::numeric, null::numeric, '/images/roupas/zara/Captura de tela 2026-09-17 144308.webp', null::text, 'cover', '[{"name":"Preto","hex":"#171717"},{"name":"Areia","hex":"#c7b89a"}]'::jsonb, array['P', 'M', 'G', 'GG']::text[], 'novo'::text, 'active', 6::integer, true, 1::integer, now() - interval '0 seconds'),
  ('strike-camisa-urban', 'Strike', 'Camisa Urban', 'Modelagem urbana com estampa autoral.', 'camisas', 189.90::numeric, 229.90::numeric, '/images/roupas/strike/images.webp', null::text, 'cover', '[{"name":"Off-white","hex":"#e8e4da"},{"name":"Preto","hex":"#161616"}]'::jsonb, array['P', 'M', 'G']::text[], null::text, 'active', 13::integer, true, 5::integer, now() - interval '1 seconds'),
  ('crosby-casaco-heritage', 'Crosby', 'Casaco Heritage', 'Estrutura contemporânea para dias mais frios.', 'casacos', 529.90::numeric, null::numeric, '/images/roupas/crosby/Captura de tela 2026-09-17 145643.webp', null::text, 'cover', '[{"name":"Grafite","hex":"#343434"},{"name":"Marrom","hex":"#563d31"}]'::jsonb, array['M', 'G', 'GG']::text[], 'ultimas-pecas'::text, 'active', 20::integer, true, 2::integer, now() - interval '2 seconds'),
  ('zara-casaco-noir', 'Zara', 'Casaco Noir', 'Silhueta precisa, construída para atravessar temporadas.', 'casacos', 619.90::numeric, null::numeric, '/images/roupas/zara/Captura de tela 2026-09-17 144423.webp', null::text, 'cover', '[{"name":"Preto","hex":"#111111"}]'::jsonb, array['P', 'M', 'G']::text[], null::text, 'active', 3::integer, false, 7::integer, now() - interval '3 seconds'),
  ('xavier-bone-club', 'Xavier', 'Boné Club', 'Ajuste confortável e acabamento minimalista.', 'chapeus-e-bones', 119.90::numeric, null::numeric, '/images/store/xavier-category-accessories.webp', '30% 82%'::text, 'cover', '[{"name":"Preto","hex":"#151515"},{"name":"Azul","hex":"#233a63"}]'::jsonb, array['Único']::text[], 'novo'::text, 'active', 10::integer, true, 3::integer, now() - interval '4 seconds'),
  ('crosby-bone-essential', 'Crosby', 'Boné Essential', 'Um essencial com assinatura discreta.', 'chapeus-e-bones', 139.90::numeric, 169.90::numeric, '/images/store/xavier-category-clothing.webp', '22% 80%'::text, 'cover', '[{"name":"Verde","hex":"#304834"},{"name":"Areia","hex":"#b6a98d"}]'::jsonb, array['Único']::text[], null::text, 'active', 17::integer, false, 12::integer, now() - interval '5 seconds'),
  ('xavier-oculos-onyx', 'Xavier', 'Óculos Onyx', 'Linhas marcantes e lentes com proteção UV.', 'oculos', 279.90::numeric, null::numeric, '/images/store/xavier-category-accessories.webp', '22% 43%'::text, 'cover', '[{"name":"Preto","hex":"#111111"},{"name":"Fumê","hex":"#625d58"}]'::jsonb, array['Único']::text[], 'novo'::text, 'active', 24::integer, true, 4::integer, now() - interval '6 seconds'),
  ('strike-oculos-prism', 'Strike', 'Óculos Prism', 'Performance visual com atitude de rua.', 'oculos', 249.90::numeric, null::numeric, '/images/store/xavier-category-accessories.webp', '48% 48%'::text, 'cover', '[{"name":"Azul","hex":"#245a80"},{"name":"Roxo","hex":"#60417b"}]'::jsonb, array['Único']::text[], 'esgotado'::text, 'out-of-stock', 0::integer, false, 14::integer, now() - interval '7 seconds'),
  ('lattafa-asad', 'Lattafa', 'Asad', 'Fragrância árabe intensa, especiada e marcante.', 'perfumes', 249.90::numeric, null::numeric, '/images/perfumes/asad-lattafa.webp', null::text, 'contain', '[{"name":"Preto","hex":"#111111"},{"name":"Dourado","hex":"#b8944e"}]'::jsonb, array['100 ml']::text[], 'novo'::text, 'active', 14::integer, true, 2::integer, now() - interval '8 seconds'),
  ('calvin-klein-be', 'Calvin Klein', 'CK Be', 'Uma assinatura limpa, fresca e confortável para todos os dias.', 'perfumes', 229.90::numeric, 279.90::numeric, '/images/perfumes/ck-be.webp', null::text, 'contain', '[{"name":"Preto","hex":"#111111"}]'::jsonb, array['100 ml', '200 ml']::text[], null::text, 'active', 21::integer, false, 8::integer, now() - interval '9 seconds'),
  ('carolina-herrera-212-vip-black', 'Carolina Herrera', '212 VIP Black', 'Aromático, sedutor e construído para a noite.', 'perfumes', 399.90::numeric, null::numeric, '/images/perfumes/212-vip-black.webp', null::text, 'contain', '[{"name":"Preto","hex":"#101010"},{"name":"Prata","hex":"#a9a9a9"}]'::jsonb, array['100 ml']::text[], 'ultimas-pecas'::text, 'active', 4::integer, true, 6::integer, now() - interval '10 seconds'),
  ('zara-sapato-monaco', 'Zara', 'Sapato Monaco', 'Construção elegante para ocasiões que pedem presença.', 'sapatos', 459.90::numeric, null::numeric, '/images/roupas/zara/Captura de tela 2026-09-17 144512.webp', '50% 62%'::text, 'cover', '[{"name":"Preto","hex":"#101010"},{"name":"Café","hex":"#4c3022"}]'::jsonb, array['39', '40', '41', '42', '43']::text[], null::text, 'active', 11::integer, false, 8::integer, now() - interval '11 seconds'),
  ('strike-tenis-axis', 'Strike', 'Tênis Axis', 'Conforto diário com construção esportiva.', 'sapatos', 349.90::numeric, null::numeric, '/images/roupas/strike/img_1997-d7756523ab99df0d9217875776080463-480-0.webp', '50% 60%'::text, 'cover', '[{"name":"Branco","hex":"#e7e7e2"},{"name":"Preto","hex":"#141414"}]'::jsonb, array['38', '39', '40', '41', '42']::text[], 'ultimas-pecas'::text, 'active', 18::integer, false, 10::integer, now() - interval '12 seconds'),
  ('crosby-calca-tailored', 'Crosby', 'Calça Tailored', 'Caimento alinhado com liberdade de movimento.', 'calcas', 329.90::numeric, null::numeric, '/images/roupas/crosby/Captura de tela 2026-09-17 145623.webp', '50% 58%'::text, 'cover', '[{"name":"Preto","hex":"#141414"},{"name":"Cinza","hex":"#575757"}]'::jsonb, array['38', '40', '42', '44']::text[], null::text, 'active', 1::integer, true, 6::integer, now() - interval '13 seconds'),
  ('zara-calca-relaxed', 'Zara', 'Calça Relaxed', 'Volume contemporâneo e tecido de toque encorpado.', 'calcas', 289.90::numeric, 349.90::numeric, '/images/roupas/zara/Captura de tela 2026-09-17 144357.webp', '50% 58%'::text, 'cover', '[{"name":"Areia","hex":"#b3a88e"},{"name":"Verde","hex":"#394a3b"}]'::jsonb, array['38', '40', '42', '44', '46']::text[], null::text, 'active', 8::integer, false, 11::integer, now() - interval '14 seconds'),
  ('strike-short-motion', 'Strike', 'Short Motion', 'Leveza e mobilidade para o ritmo da cidade.', 'shorts', 169.90::numeric, null::numeric, '/images/roupas/strike/313022291826e187197a5f88409b551d-39e2b5a0bd5556bd1217605398354924-480-0.webp', '50% 58%'::text, 'cover', '[{"name":"Preto","hex":"#111111"},{"name":"Verde","hex":"#314638"}]'::jsonb, array['P', 'M', 'G', 'GG']::text[], 'novo'::text, 'active', 15::integer, false, 9::integer, now() - interval '15 seconds'),
  ('xavier-short-resort', 'Xavier', 'Short Resort', 'Essencial descontraído com acabamento premium.', 'shorts', 199.90::numeric, 239.90::numeric, '/images/store/xavier-category-clothing.webp', '62% 78%'::text, 'cover', '[{"name":"Azul","hex":"#304968"},{"name":"Off-white","hex":"#e6e0d3"}]'::jsonb, array['P', 'M', 'G']::text[], null::text, 'active', 22::integer, false, 16::integer, now() - interval '16 seconds'),
  ('xavier-training-set', 'Xavier Active', 'Training Set', 'Conjunto técnico para treinos e deslocamentos.', 'roupas-de-academia', 299.90::numeric, null::numeric, '/images/store/xavier-store-showcase.webp', '20% 72%'::text, 'cover', '[{"name":"Preto","hex":"#121212"},{"name":"Marinho","hex":"#1c293c"}]'::jsonb, array['P', 'M', 'G', 'GG']::text[], 'novo'::text, 'active', 5::integer, false, 13::integer, now() - interval '17 seconds'),
  ('strike-performance-tee', 'Strike', 'Performance Tee', 'Respirabilidade, secagem rápida e corte atlético.', 'roupas-de-academia', 149.90::numeric, null::numeric, '/images/roupas/strike/img_1997-d7756523ab99df0d9217875776080463-480-0.webp', null::text, 'cover', '[{"name":"Preto","hex":"#111111"},{"name":"Cinza","hex":"#696969"}]'::jsonb, array['P', 'M', 'G']::text[], 'esgotado'::text, 'out-of-stock', 0::integer, false, 15::integer, now() - interval '18 seconds')
) as v (
  slug, brand, name, description, category_slug,
  price, original_price,
  image_url, image_position, image_fit,
  colors, sizes, badge, status,
  stock, is_featured, featured_rank, created_at
)
join public.categories c on c.slug = v.category_slug
on conflict (slug) do nothing;

insert into public.store_settings (id, eyebrow, title, description, hero_image, announcement_enabled, announcement, whatsapp, instagram, address, opening_hours, seo_title, seo_description)
values (true, 'Xavier Store · Curadoria masculina', 'Vista sua presença.', 'Peças escolhidas para quem entende que estilo não precisa falar alto para ser percebido.', '/images/store/xavier-category-clothing.webp', false, 'Novidades selecionadas toda semana', '+55 (83) 8893-3979', '@xaviercollection', 'Rua Sólon de Lucena, 26 — Centro de Arara', 'Segunda a sábado, das 08h às 18h', 'Loja | Xavier Collection', 'Explore a seleção de moda masculina, acessórios e lifestyle da Xavier Collection.')
on conflict (id) do nothing;
