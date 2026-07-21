import dotenv from 'dotenv';
import path from 'path';

// Carrega .env do diretório do backend
dotenv.config();

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória não configurada: ${key}`);
  }
  return value;
}

export const env = {
  port: process.env.PORT || '3001',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean),
  supabaseUrl: requiredEnv('SUPABASE_URL'),
  supabaseServiceRoleKey: requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  adminEmail: process.env.ADMIN_EMAIL || 'admin@central.com'
};
