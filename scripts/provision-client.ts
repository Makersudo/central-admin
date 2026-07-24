import fs from 'fs';
import path from 'path';

// Configurações do Supabase da Central Admin
const SUPABASE_URL = 'https://augeggvlijscaebcggvk.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1Z2VnZ3ZsaWpzY2FlYmNnZ3ZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTk4MzU1MSwiZXhwIjoyMDk1NTU5NTUxfQ.GAyDM47edl59b0waLX79r79Y_boxPsTK4ox-jww1Un8';

interface ProvisionOptions {
  clientName: string;
  domain: string;
  plan: 'basic' | 'medium' | 'master' | 'custom';
  price: number;
  licenseKey: string;
  whatsappSupport?: string;
  destinationDir?: string;
}

// Preços padrão dos planos se não informados
const DEFAULT_PLAN_PRICES = {
  basic: 149.90,
  medium: 399.90,
  master: 749.90,
  custom: 399.90
};

// Pasta modelo/template master do catálogo
const TEMPLATE_DIR = 'C:/Users/AI/Documents/PLATAFORMA DE CATALOGOS/PACOTE R$399,90/MK MAKER/frontend';
const WORKSPACE_ROOT = 'C:/Users/AI/Documents/PLATAFORMA DE CATALOGOS';

function copyRecursiveSync(src: string, dest: string) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      if (['node_modules', '.git', 'dist', '.vercel', '.render'].includes(childItemName)) {
        return;
      }
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

export async function provisionNewClient(options: ProvisionOptions) {
  console.log('\n🚀 ========================================================');
  console.log(`🚀 INICIANDO PROVISIONAMENTO AUTOMÁTICO: ${options.clientName.toUpperCase()}`);
  console.log('🚀 ========================================================\n');

  const plan = options.plan || 'basic';
  const price = options.price || DEFAULT_PLAN_PRICES[plan];
  const licenseKey = options.licenseKey || `LIC-${options.clientName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 dias

  // ------------------------------------------------------------------
  // PASSO 1: CRIAR REGISTRO DA LICENÇA / USUÁRIO NA CENTRAL ADMIN (SUPABASE REST)
  // ------------------------------------------------------------------
  console.log('⚡ [PASSO 1/4] Registrando licença do cliente no banco da Central Admin...');

  const metaPayload = {
    expires_at: expiresAt.toISOString(),
    scheduled_block_at: null,
    scheduled_unblock_at: null,
    plan_start_date: now.toISOString(),
    billing_cycle_days: 30,
    payment_status: 'paid',
    plan_price: price,
    last_payment_date: now.toISOString(),
    store_plan: plan
  };

  const messageWithMeta = `Licença criada para ${options.clientName} (Plano ${plan.toUpperCase()}) ||META:${JSON.stringify(metaPayload)}`;

  const bodyData = {
    license_key: licenseKey,
    client_name: options.clientName,
    domain: options.domain || `${options.clientName.toLowerCase().replace(/\s+/g, '')}.vercel.app`,
    active: true,
    message: messageWithMeta,
    support_contact: options.whatsappSupport || null,
    updated_at: now.toISOString()
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/catalog_licenses`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation,resolution=merge-duplicates'
    },
    body: JSON.stringify(bodyData)
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('❌ ERRO ao criar licença na Central Admin:', errorText);
    throw new Error(`Falha no banco de dados: ${errorText}`);
  }

  const dbRows = await res.json();
  const dbData = Array.isArray(dbRows) ? dbRows[0] : dbRows;

  console.log(`✅ Licença registrada com sucesso na Central Admin!`);
  console.log(`   └─ ID: ${dbData.id}`);
  console.log(`   └─ Chave: ${dbData.license_key}`);
  console.log(`   └─ Plano: ${plan.toUpperCase()} (R$ ${price.toFixed(2)}/mês)`);
  console.log(`   └─ Validade Inicial: ${expiresAt.toLocaleDateString('pt-BR')}`);

  // ------------------------------------------------------------------
  // PASSO 2: DEFINIR PASTA DE DESTINO E COPIAR CÓDIGO FONTE
  // ------------------------------------------------------------------
  const planFolderName = plan === 'basic' ? 'PACOTE R$149,90 - BASIC' : plan === 'master' ? 'PACOTE R$749,90 - MASTER' : 'PACOTE R$399,90 - MEDIUM';
  const targetFolder = options.destinationDir || path.join(WORKSPACE_ROOT, planFolderName, options.clientName, 'frontend');

  console.log(`\n📁 [PASSO 2/4] Copiando código-fonte limpo para a pasta do cliente...`);
  console.log(`   └─ Origem: ${TEMPLATE_DIR}`);
  console.log(`   └─ Destino: ${targetFolder}`);

  if (fs.existsSync(targetFolder)) {
    console.warn(`⚠️ A pasta de destino já existe! Limpando conteúdo anterior...`);
    fs.rmSync(targetFolder, { recursive: true, force: true });
  }

  copyRecursiveSync(TEMPLATE_DIR, targetFolder);
  console.log(`✅ Código do catálogo copiado com sucesso!`);

  // ------------------------------------------------------------------
  // PASSO 3: SANITIZAÇÃO DE TOKENS, CRONTABS E DADOS DEMO
  // ------------------------------------------------------------------
  console.log(`\n🧹 [PASSO 3/4] Sanitizando credenciais, tokens antigos e arquivos sensíveis...`);

  // 3.1 Criar novo .env exclusivo do cliente (sem tokens de Vercel/Render/Supabase admin velhos)
  const envContent = `# Configurações Exclusivas da Loja: ${options.clientName}
VITE_STORE_NAME="${options.clientName}"
VITE_API_URL="http://localhost:3000"
VITE_INSTAGRAM_URL="https://www.instagram.com/"

# Licenciamento da Central de Gerenciamento
VITE_CENTRAL_API_URL="https://central-admin-backend.onrender.com"
VITE_CENTRAL_LICENSE_KEY="${licenseKey}"

# Conexão Pública Supabase (Usa apenas a anon key segura)
VITE_SUPABASE_URL="https://augeggvlijscaebcggvk.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1Z2VnZ3ZsaWpzY2FlYmNnZ3ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5ODM1NTEsImV4cCI6MjA5NTU1OTU1MX0.GAyDM47edl59b0waLX79r79Y_boxPsTK4ox-jww1Un8"
`;

  fs.writeFileSync(path.join(targetFolder, '.env'), envContent, 'utf8');
  console.log(`   └─ Arquivo .env gerado com a licença [${licenseKey}]`);

  // 3.2 Remover arquivos temporários/senhas locais residuais se existirem
  const residualFiles = ['SENHAIPHON.txt', 'central.txt', '.env.local', 'dist'];
  for (const rf of residualFiles) {
    const fullRf = path.join(targetFolder, rf);
    if (fs.existsSync(fullRf)) {
      if (fs.statSync(fullRf).isDirectory()) {
        fs.rmSync(fullRf, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullRf);
      }
      console.log(`   └─ Removido arquivo residual: ${rf}`);
    }
  }

  // ------------------------------------------------------------------
  // PASSO 4: RESUMO FINAL E STATUS
  // ------------------------------------------------------------------
  console.log(`\n🎉 ========================================================`);
  console.log(`🎉 CLIENTE PROVISIONADO COM SUCESSO!`);
  console.log(`🎉 ========================================================`);
  console.log(`🏢 Cliente: ${options.clientName}`);
  console.log(`🏷️ Plano: ${plan.toUpperCase()} (R$ ${price.toFixed(2)}/mês)`);
  console.log(`🔑 Chave da Licença: ${licenseKey}`);
  console.log(`📍 Pasta Criada: ${targetFolder}`);
  console.log(`🛡️ Status na Central: ATIVO ✅ (Vinculado ao Bloqueio Automático por Inadimplência)`);
  console.log(`========================================================\n`);

  return {
    success: true,
    licenseKey,
    targetFolder,
    license: dbData
  };
}

// Suporte a execução via linha de comando (CLI)
if (process.argv[1] && process.argv[1].endsWith('provision-client.ts')) {
  const args = process.argv.slice(2);
  const getArg = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const clientName = getArg('--name') || getArg('-n');
  const plan = (getArg('--plan') || getArg('-p') || 'basic') as any;
  const domain = getArg('--domain') || getArg('-d') || '';
  const price = getArg('--price') ? Number(getArg('--price')) : undefined;
  const licenseKey = getArg('--key') || getArg('-k') || '';

  if (!clientName) {
    console.log(`
Uso do Script de Provisionamento:
  npx tsx scripts/provision-client.ts --name "Nome do Cliente" [opções]

Opções:
  --name, -n     Nome do cliente / loja (Obrigatório)
  --plan, -p     Plano: basic | medium | master (Padrão: basic)
  --price        Valor mensal customizado R$ (Opcional)
  --domain, -d   Domínio do cliente (Opcional)
  --key, -k      Chave de licença customizada (Opcional)

Exemplo:
  npx tsx scripts/provision-client.ts --name "Ana Beauty" --plan basic --price 149.90
`);
    process.exit(0);
  }

  provisionNewClient({
    clientName,
    plan,
    domain,
    price: price || DEFAULT_PLAN_PRICES[plan as keyof typeof DEFAULT_PLAN_PRICES] || 149.90,
    licenseKey: licenseKey || `LIC-${clientName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`
  }).catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
  });
}
