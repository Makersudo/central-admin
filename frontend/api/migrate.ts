import { Client } from 'pg';

export default async function handler(req: any, res: any) {
  try {
    const client = new Client({
      host: '2600:1f13:5fd:be00:104a:7e89:17c5:6d81',
      port: 5432,
      user: 'postgres',
      password: '75487319@fF',
      database: 'postgres',
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    await client.query(`
      ALTER TABLE public.catalog_licenses ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
      ALTER TABLE public.catalog_licenses ADD COLUMN IF NOT EXISTS scheduled_block_at TIMESTAMPTZ;
      ALTER TABLE public.catalog_licenses ADD COLUMN IF NOT EXISTS scheduled_unblock_at TIMESTAMPTZ;
      NOTIFY pgrst, 'reload schema';
    `);
    await client.end();

    return res.status(200).json({ success: true, message: "Colunas criadas e PostgREST schema recarregado via IP 2600:1f13:5fd:be00:104a:7e89:17c5:6d81!" });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}
