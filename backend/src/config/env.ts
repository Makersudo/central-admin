import dotenv from 'dotenv';

dotenv.config();

const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseServiceRoleKey && process.env.NODE_ENV === 'production') {
  console.warn("⚠️ ALERTA DE SEGURANÇA: SUPABASE_SERVICE_ROLE_KEY não configurada via variável de ambiente.");
}

export const env = {
  port: process.env.PORT || '3001',
  nodeEnv: process.env.NODE_ENV || 'production',
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean),
  supabaseUrl: process.env.SUPABASE_URL || 'https://augeggvlijscaebcggvk.supabase.co',
  supabaseServiceRoleKey: supabaseServiceRoleKey || '',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@central.com'
};

