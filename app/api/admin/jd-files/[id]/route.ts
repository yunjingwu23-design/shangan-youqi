import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api } from '@/lib/api';
import { siteManager } from '@/lib/catalog-server';
import { readJdOriginal, jdMime, type JdType } from '@/lib/admin/jd-files';
export const GET = api(async (request) => {
  const identity = await siteManager(),
    id = z.uuid().parse(new URL(request.url).pathname.split('/').at(-1)),
    file = await readJdOriginal(identity, id),
    name = encodeURIComponent(file.file_name).replace(
      /['()*]/g,
      (value) => '%' + value.charCodeAt(0).toString(16)
    );
  return new NextResponse(new Uint8Array(file.bytes).buffer, {
    headers: {
      'Content-Type': jdMime[file.file_type as JdType],
      'Content-Disposition': `attachment; filename="jd.${file.file_type}"; filename*=UTF-8''${name}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});
