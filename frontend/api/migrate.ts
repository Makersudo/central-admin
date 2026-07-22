import { Client } from 'pg';

const connectionStrings = [
  "postgres://postgres.augeggvlijscaebcggvk:75487319%40fF@aws-0-sa-east-1.pooler.supabase.com:6543/postgres",
  "postgres://postgres.augeggvlijscaebcggvk:75487319%40fF@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
  "postgres://postgres.augeggvlijscaebcggvk:75487319%40fF@aws-0-sa-east-1.pooler.supabase.com:5432/postgres",
  "postgres://postgres.augeggvlijscaebcggvk:75487319%40fF@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
];

export default async function handler(req: any, res: any) {
  const logs: string[] = [];
  for (const connStr of connectionStrings) {
    const masked = connStr.replace(/:[^:@]+@/, ':****@');
    try {
      logs.push(`Connecting to ${masked}...`);
      const client = new Client({
        connectionString: connStr,
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

      return res.status(200).json({ success: true, message: `Colunas criadas via ${masked}!`, logs });
    } catch (err: any) {
      logs.push(`Failed ${masked}: ${err.message}`);
    }
  }

  return res.status(500).json({ error: "Todas as tentativas de conexão falharam.", logs });
}
