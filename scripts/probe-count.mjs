import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await db.from('job_catalog').select('company').eq('type','autumn_recruitment');
if (error) { console.error(error); process.exit(1); }
const companies = [...new Set(data.map(d => d.company))];
console.log('秋招公司数:', companies.length);
console.log(companies.join('、'));
