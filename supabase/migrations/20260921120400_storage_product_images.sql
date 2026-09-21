-- Xavier Collection — bucket de imagens de produtos.
--
-- Bucket público: qualquer pessoa LÊ imagens pela URL pública
-- (/storage/v1/object/public/product-images/...), sem policy de SELECT para anon
-- (o que também impede listagem anônima do bucket).
-- Escrita (upload/troca/remoção) apenas para administradores, somente sob "products/".

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MiB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy product_images_select_admin
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'product-images'
    and (select public.is_admin())
  );

create policy product_images_insert_admin
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = 'products'
    and (select public.is_admin())
  );

create policy product_images_update_admin
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and (select public.is_admin())
  )
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = 'products'
    and (select public.is_admin())
  );

create policy product_images_delete_admin
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and (select public.is_admin())
  );
