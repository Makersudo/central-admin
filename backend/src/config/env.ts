import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: process.env.PORT || '3001',
  nodeEnv: process.env.NODE_ENV || 'production',
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean),
  supabaseUrl: process.env.SUPABASE_URL || 'https://augeggvlijscaebcggvk.supabase.co',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1Z2VnZ3ZsaWpzY2FlYmNnZ3ZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTk4MzU1MSwiZXhwIjoyMDk1NTU5NTUxfQ.GAyDM47edl59b0waLX79r79Y_boxPsTK4ox-jww1Un8',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@central.com'
};
