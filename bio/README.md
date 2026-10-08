# Xavier Collection — bio

Página de bio publicada em **https://xaviercollection.com.br/**. É uma app Next.js independente da loja
(que continua em **https://loja.xaviercollection.com.br/**): pacote, dependências, build e projeto Vercel
próprios. Nada aqui importa código da loja nem fala com Supabase.

## Onde trocar os links

Tudo fica em [`config/site.ts`](config/site.ts), no objeto `LINKS`:

| Botão           | Chave       | Destino atual                                                | Formato aceito                                                     |
| --------------- | ----------- | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| EXPLORAR A LOJA | `store`     | `https://loja.xaviercollection.com.br/`                      | só a loja (mesma aba)                                              |
| WHATSAPP        | `whatsapp`  | `https://wa.me/558388933979`                                 | `https://wa.me/` + 55 + DDD + número, só dígitos                   |
| INSTAGRAM       | `instagram` | `https://www.instagram.com/xaviercollection2/`               | `https://www.instagram.com/perfil/`                                |
| VISITAR A LOJA  | `location`  | `https://maps.google.com/?q=Rua+Solon+de+Lucena+26+Arara`    | Google Maps (`maps.google.com`, `google.com/maps`, `maps.app.goo.gl`) |

Se um link for trocado por algo fora do formato acima, o build falha antes de publicar — assim um botão
quebrado nunca vai ao ar. WhatsApp, Instagram e mapa abrem em nova aba.

Os textos da página (marca, slogan, apoio e rodapé) estão no mesmo arquivo, em `COPY`.

## Rodar localmente

```bash
cd bio
npm install
npm run dev     # http://localhost:3001
npm run lint
npm test
npm run build
```

## Estrutura

```
bio/
  app/
    layout.tsx            fontes (Bodoni Moda + Archivo, as mesmas da loja) e metadados
    page.tsx              a página: monograma, marca, slogan, quatro botões, rodapé
    globals.css           todo o visual e a camada de movimento (CSS puro, respeita reduced motion)
    not-found.tsx         404 com volta para o início
    icon.svg              favicon com o monograma
    apple-icon.tsx        ícone da tela inicial do iPhone (gerado no build)
    opengraph-image.tsx   prévia do link no WhatsApp/Instagram (gerada no build)
    robots.ts, sitemap.ts
  components/             Monogram (X Didone em SVG) e Arrow
  config/site.ts          textos e links — único arquivo a editar no dia a dia
  tests/site.test.mjs     conteúdo, ordem dos botões e validação dos links
```

`/loja` e `/admin` no domínio principal redirecionam para os mesmos caminhos em
`loja.xaviercollection.com.br`, para links antigos continuarem funcionando.

## Deploy (projeto Vercel separado)

A bio é um **segundo projeto** na Vercel, ligado ao mesmo repositório. O projeto da loja não muda.

1. Vercel → **Add New… → Project** → importe `xaviercollection/XavierRunning` (o mesmo repositório).
2. Na tela de configuração:
   - **Project Name:** `xavier-bio` (ou outro nome — não reutilize o da loja);
   - **Root Directory:** clique em *Edit* e escolha **`bio`**;
   - **Framework Preset:** Next.js (detectado sozinho). Build, install e output: deixe o padrão;
   - **Environment Variables:** nenhuma.
3. **Deploy.** A bio fica no ar em um endereço `*.vercel.app`, e cada Pull Request passa a ter preview
   da bio também.
4. *(Opcional)* Para a bio só refazer deploy quando `bio/` mudar: **Settings → Build and Deployment →
   Ignored Build Step → Custom** com `git diff --quiet HEAD^ HEAD -- .`
5. **Domínio** — mexa só no domínio principal:
   - No projeto **da loja**, em **Settings → Domains**, veja se `xaviercollection.com.br` (e `www.`) está
     listado. Se estiver, remova **apenas** essas entradas. **Não toque em `loja.xaviercollection.com.br`.**
   - No projeto **da bio**, em **Settings → Domains**, adicione `xaviercollection.com.br`. Se quiser o `www`,
     adicione `www.xaviercollection.com.br` redirecionando para o domínio principal.
   - DNS: se o domínio usa os nameservers da Vercel, não há nada a fazer. Se o DNS está em outro provedor,
     crie/ajuste o registro do domínio principal exatamente com o valor que a Vercel mostrar nessa tela.
     O registro `loja` continua como está.
6. **Conferir:** `https://xaviercollection.com.br` abre a bio; `https://loja.xaviercollection.com.br`
   continua abrindo a loja; os quatro botões levam aos destinos certos.

Se o projeto da loja tiver `NEXT_PUBLIC_SITE_URL=https://xaviercollection.com.br`, o canonical, o
`robots.txt` e o `sitemap.xml` da loja vão apontar para o domínio que passa a ser da bio. Vale trocar essa
variável da loja para `https://loja.xaviercollection.com.br` (e refazer o deploy da loja) — mudança que
fica fora deste diretório.
