import { Client } from 'pg';

export default async function handler(req: any, res: any) {
  try {
    const dbUrl = "postgres://postgres:75487319%40fF@db.augeggvlijscaebcggvk.supabase.co:5432/postgres";
    const client = new Client({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      // Force Node pg to use IPv6 family 6
      family: 6
    } as any);

    await client.connect();
    await client.query(`
      ALTER TABLE public.catalog_licenses ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
      ALTER TABLE public.catalog_licenses ADD COLUMN IF NOT EXISTS scheduled_block_at TIMESTAMPTZ;
      ALTER TABLE public.catalog_licenses ADD COLUMN IF NOT EXISTS scheduled_unblock_at TIMESTAMPTZ;
      NOTIFY pgrst, 'reload schema';
    `);
    await client.end();

    return res.status(200).json({ success: true, message: "Colunas criadas e PostgREST schema recarregado com sucesso via Vercel IPv6!" });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}
