insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('interview-audio','interview-audio',false,52428800,array[
  'audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/wav','audio/x-wav',
  'audio/webm','video/webm','video/mp4','audio/ogg','application/ogg'
]) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Extra restrictive policies prevent a pre-existing broad bucket policy from
-- inadvertently exposing interview audio. Only signed server-issued uploads.
create policy interview_audio_anon_block on storage.objects as restrictive for all to anon
  using(bucket_id<>'interview-audio') with check(bucket_id<>'interview-audio');
create policy interview_audio_owner_boundary on storage.objects as restrictive for all to authenticated
  using(bucket_id<>'interview-audio' or exists(
    select 1 from public.interviews i where i.audio_path=name and i.user_id=(select private.current_user_id())
  )) with check(bucket_id<>'interview-audio');
create policy interview_audio_read on storage.objects for select to authenticated
  using(bucket_id='interview-audio' and exists(
    select 1 from public.interviews i where i.audio_path=name and i.user_id=(select private.current_user_id())
  ));

-- Data clearing schedules storage cleanup even when called directly as an RPC.
create or replace function public.delete_my_personal_data() returns void
language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=private.current_user_id();
begin
  if owner_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  delete from public.interviews where user_id=owner_id;
  delete from public.workspace_entries where user_id=owner_id;
  update public.profiles set full_name='',desired_role='',city='',bio='' where user_id=owner_id;
end $$;
notify pgrst,'reload schema';
