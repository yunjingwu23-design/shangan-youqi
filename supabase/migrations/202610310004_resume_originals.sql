-- Optional explicit bootstrap/hardening. The app can create this private bucket on first upload.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('resume-originals','resume-originals',false,3145728,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
-- Even if another application adds a broad permissive policy, these originals remain server-only.
-- The server checks the owning workspace_entries row and streams the file; no public URL is issued.
create policy resume_originals_server_only on storage.objects as restrictive for all to anon,authenticated
using(bucket_id <> 'resume-originals') with check(bucket_id <> 'resume-originals');
