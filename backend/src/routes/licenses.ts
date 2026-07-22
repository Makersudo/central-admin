import { Router } from 'express';
import { getSupabaseAdmin } from '../lib/supabase.js';
import { ApiError, handleError, ok, requireString, optionalString } from '../lib/http.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { rateLimit, loginKey } from '../middleware/rateLimit.js';

export const licensesRouter = Router();

// Limite de 10 tentativas de login por minuto por IP/email
const loginRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyPrefix: 'login',
  keyGenerator: loginKey
});

// Limite de 120 validações de licença por minuto por IP (chamado pelos catálogos)
const validateRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyPrefix: 'validate'
});

const META_TAG = '||META:';

function decodeLicenseData(row: any) {
  if (!row) return row;
  const result = { ...row };
  let rawMsg = result.message || '';

  if (rawMsg.includes(META_TAG)) {
    const parts = rawMsg.split(META_TAG);
    result.message = parts[0].trim() || null;
    try {
      const meta = JSON.parse(parts[1]);
      if (meta.expires_at !== undefined) result.expires_at = meta.expires_at;
      if (meta.scheduled_block_at !== undefined) result.scheduled_block_at = meta.scheduled_block_at;
      if (meta.scheduled_unblock_at !== undefined) result.scheduled_unblock_at = meta.scheduled_unblock_at;
      if (meta.plan_start_date !== undefined) result.plan_start_date = meta.plan_start_date;
      if (meta.billing_cycle_days !== undefined) result.billing_cycle_days = meta.billing_cycle_days;
    } catch (e) {
      console.warn("Failed to parse META json:", e);
    }
  }

  return result;
}

function encodeMessageWithMeta(userMessage: string | null | undefined, metaPayload: Record<string, any>) {
  const cleanMsg = (userMessage || '').replace(/\|\|META:[\s\S]*/, '').trim();
  const metaJson = JSON.stringify(metaPayload);
  return `${cleanMsg} ${META_TAG}${metaJson}`.trim();
}

function parsePayload(body: any) {
  const expires_at = body.expires_at || body.expiresAt || null;
  const scheduled_block_at = body.scheduled_block_at || body.scheduledBlockAt || null;
  const scheduled_unblock_at = body.scheduled_unblock_at || body.scheduledUnblockAt || null;
  const plan_start_date = body.plan_start_date || body.planStartDate || null;
  const billing_cycle_days = Number(body.billing_cycle_days || body.billingCycleDays || 30);

  const rawMessage = optionalString(body.message) ?? null;
  const meta = {
    expires_at,
    scheduled_block_at,
    scheduled_unblock_at,
    plan_start_date,
    billing_cycle_days
  };

  return {
    license_key:          requireString(body.licenseKey ?? body.license_key, 'licenseKey'),
    client_name:          requireString(body.clientName ?? body.client_name, 'clientName'),
    domain:               optionalString(body.domain) ?? null,
    active:               Boolean(body.active ?? true),
    message:              encodeMessageWithMeta(rawMessage, meta),
    support_contact:      optionalString(body.supportContact ?? body.support_contact) ?? null,
    expires_at,
    scheduled_block_at,
    scheduled_unblock_at,
    plan_start_date,
    billing_cycle_days
  };
}

// ─── PUBLIC ──────────────────────────────────────────────────────────────────

/** POST /api/licenses/auth/login — Autenticação do Administrador */
licensesRouter.post('/auth/login', loginRateLimit, async (req, res) => {
  try {
    const email = requireString(req.body.email, 'email');
    const password = requireString(req.body.password, 'password');

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.session) {
      throw new ApiError(401, error?.message || 'E-mail ou senha incorretos.');
    }

    return ok(res, {
      token: data.session.access_token,
      user: data.user
    });
  } catch (err) {
    return handleError(res, err);
  }
});

/** GET /api/licenses/validate — Valida se uma licença está ativa (chamado pelos catálogos) */
licensesRouter.get('/validate', validateRateLimit, async (req, res) => {
  try {
    const key = req.query.key as string;
    const domain = req.query.domain as string;

    if (!key) {
      throw new ApiError(400, 'Chave de licença não fornecida.');
    }

    const supabase = getSupabaseAdmin();
    const { data: rawData, error } = await supabase
      .from('catalog_licenses')
      .select('*')
      .eq('license_key', key)
      .maybeSingle();

    if (error) throw new ApiError(500, error.message);
    
    if (!rawData) {
      return ok(res, {
        active: false,
        status: 'not_found',
        message: 'Licença inválida ou não registrada.',
      });
    }

    const data = decodeLicenseData(rawData);
    const now = new Date();

    // 0. Verificação de Ciclo de 30 Dias (Plan Start Date)
    if (data.plan_start_date) {
      const startDate = new Date(data.plan_start_date);
      const cycleDays = Number(data.billing_cycle_days || 30);
      const diffMs = now.getTime() - startDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays > cycleDays) {
        const nextCycleExpiry = data.expires_at ? new Date(data.expires_at) : new Date(startDate.getTime() + cycleDays * 24 * 60 * 60 * 1000);
        if (now >= nextCycleExpiry) {
          return ok(res, {
            active: false,
            status: 'suspended',
            message: 'Ciclo de 30 dias do plano encerrado. Entre em contato com o suporte para renovação.',
            supportContact: data.support_contact,
            reason: 'cycle_expired'
          });
        }
      }
    }

    // 1. Verificação de expiração por data/hora
    if (data.expires_at && now >= new Date(data.expires_at)) {
      return ok(res, {
        active: false,
        status: 'suspended',
        message: 'Licença expirada. Entre em contato com o suporte para renovação.',
        supportContact: data.support_contact,
        reason: 'expired'
      });
    }

    // 2. Verificação de agendamento de bloqueio por data/hora
    let isScheduledBlocked = false;
    if (data.scheduled_block_at && now >= new Date(data.scheduled_block_at)) {
      if (data.scheduled_unblock_at && new Date(data.scheduled_unblock_at) > new Date(data.scheduled_block_at) && now >= new Date(data.scheduled_unblock_at)) {
        isScheduledBlocked = false;
      } else {
        isScheduledBlocked = true;
      }
    }

    if (isScheduledBlocked) {
      return ok(res, {
        active: false,
        status: 'suspended',
        message: data.message || 'Plataforma suspensa conforme bloqueio agendado.',
        supportContact: data.support_contact,
        reason: 'scheduled_block'
      });
    }

    // 3. Verificação de chave desativada manualmente
    if (!data.active) {
      if (data.scheduled_unblock_at && now >= new Date(data.scheduled_unblock_at)) {
        // Liberado por agendamento de desbloqueio
      } else {
        return ok(res, {
          active: false,
          status: 'suspended',
          message: data.message || 'Plataforma suspensa por pendências financeiras.',
          supportContact: data.support_contact,
          reason: 'manual_block'
        });
      }
    }

    return ok(res, {
      active: true,
      status: 'active',
      clientName: data.client_name,
      domain: data.domain,
      expiresAt: data.expires_at,
      planStartDate: data.plan_start_date,
      billingCycleDays: data.billing_cycle_days || 30
    });
  } catch (err) {
    return handleError(res, err);
  }
});

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────

/** Helper resiliente para atualizar/inserir tratando colunas novas ainda não criadas no Supabase */
async function safeSupabaseUpdate(supabase: any, table: string, id: string, payload: Record<string, any>) {
  // Extrai meta e aplica ao campo message
  const rawMsg = payload.message || '';
  const metaPayload = {
    expires_at: payload.expires_at ?? null,
    scheduled_block_at: payload.scheduled_block_at ?? null,
    scheduled_unblock_at: payload.scheduled_unblock_at ?? null,
    plan_start_date: payload.plan_start_date ?? null,
    billing_cycle_days: payload.billing_cycle_days ?? 30
  };

  const messageWithMeta = encodeMessageWithMeta(rawMsg, metaPayload);

  // 1. Tenta atualizar com todos os campos
  let { data, error } = await supabase
    .from(table)
    .update({ ...payload, message: messageWithMeta })
    .eq('id', id)
    .select()
    .single();

  if (!error) return { data: decodeLicenseData(data), error: null };

  // 2. Se falhou devido a colunas extras (PGRST204 ou erro de schema), remove campos novos e tenta com campos core
  console.warn("Retrying Supabase update with core fields + metadata message:", error.message);
  const corePayload: Record<string, any> = {};
  const allowedCoreKeys = ['license_key', 'client_name', 'domain', 'active', 'support_contact'];
  for (const k of allowedCoreKeys) {
    if (payload[k] !== undefined) corePayload[k] = payload[k];
  }

  corePayload.message = messageWithMeta;

  const result = await supabase
    .from(table)
    .update(corePayload)
    .eq('id', id)
    .select()
    .single();

  if (result.data) {
    result.data = decodeLicenseData(result.data);
  }

  return result;
}

/** POST /api/licenses/admin/:id/renew — Renova a licença por +30 dias (registrado antes de :id wildcard) */
licensesRouter.post('/admin/:id/renew', requireAuth, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = req.params;

    const { data: rawLicense, error: fetchErr } = await supabase
      .from('catalog_licenses')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !rawLicense) throw new ApiError(404, 'Licença não encontrada.');

    const license = decodeLicenseData(rawLicense);
    const now = new Date();
    const cycleDays = Number(license.billing_cycle_days || 30);

    const baseDate = (license.expires_at && new Date(license.expires_at) > now) 
      ? new Date(license.expires_at) 
      : now;

    const newExpiresAt = new Date(baseDate.getTime() + cycleDays * 24 * 60 * 60 * 1000);

    const renewPayload = {
      active: true,
      expires_at: newExpiresAt.toISOString(),
      scheduled_block_at: newExpiresAt.toISOString(),
      scheduled_unblock_at: null,
      message: license.message
    };

    const { data, error } = await safeSupabaseUpdate(supabase, 'catalog_licenses', id, renewPayload);

    if (error) throw new ApiError(500, error.message);
    return ok(res, data);
  } catch (err) {
    return handleError(res, err);
  }
});

/** GET /api/licenses/admin — Listar todas as licenças cadastradas */
licensesRouter.get('/admin', requireAuth, async (_req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('catalog_licenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new ApiError(500, error.message);
    const decoded = (data ?? []).map(decodeLicenseData);
    return ok(res, decoded);
  } catch (err) {
    return handleError(res, err);
  }
});

/** POST /api/licenses/admin — Criar licença */
licensesRouter.post('/admin', requireAuth, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const payload = parsePayload(req.body);

    let { data, error } = await supabase
      .from('catalog_licenses')
      .insert(payload)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new ApiError(400, 'Esta chave de licença já está em uso.');
      }

      const corePayload: Record<string, any> = {
        license_key: payload.license_key,
        client_name: payload.client_name,
        domain: payload.domain,
        active: payload.active,
        message: payload.message,
        support_contact: payload.support_contact
      };

      const fallbackRes = await supabase
        .from('catalog_licenses')
        .insert(corePayload)
        .select()
        .single();

      if (fallbackRes.error) {
        throw new ApiError(500, fallbackRes.error.message);
      }
      data = fallbackRes.data;
    }

    return ok(res, decodeLicenseData(data), 201);
  } catch (err) {
    return handleError(res, err);
  }
});

/** PUT /api/licenses/admin/:id — Atualizar licença */
licensesRouter.put('/admin/:id', requireAuth, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = req.params;
    
    const updateData: Record<string, any> = {};
    if (req.body.active !== undefined) updateData.active = Boolean(req.body.active);
    if (req.body.clientName || req.body.client_name) updateData.client_name = req.body.clientName || req.body.client_name;
    if (req.body.licenseKey || req.body.license_key) updateData.license_key = req.body.licenseKey || req.body.license_key;
    if (req.body.domain !== undefined) updateData.domain = req.body.domain;
    if (req.body.message !== undefined) updateData.message = req.body.message;
    if (req.body.supportContact !== undefined || req.body.support_contact !== undefined) {
      updateData.support_contact = req.body.supportContact ?? req.body.support_contact;
    }
    if (req.body.expires_at !== undefined || req.body.expiresAt !== undefined) {
      updateData.expires_at = req.body.expires_at ?? req.body.expiresAt ?? null;
    }
    if (req.body.scheduled_block_at !== undefined || req.body.scheduledBlockAt !== undefined) {
      updateData.scheduled_block_at = req.body.scheduled_block_at ?? req.body.scheduledBlockAt ?? null;
    }
    if (req.body.scheduled_unblock_at !== undefined || req.body.scheduledUnblockAt !== undefined) {
      updateData.scheduled_unblock_at = req.body.scheduled_unblock_at ?? req.body.scheduledUnblockAt ?? null;
    }
    if (req.body.plan_start_date !== undefined || req.body.planStartDate !== undefined) {
      updateData.plan_start_date = req.body.plan_start_date ?? req.body.planStartDate ?? null;
    }
    if (req.body.billing_cycle_days !== undefined || req.body.billingCycleDays !== undefined) {
      updateData.billing_cycle_days = Number(req.body.billing_cycle_days ?? req.body.billingCycleDays ?? 30);
    }

    const { data, error } = await safeSupabaseUpdate(supabase, 'catalog_licenses', id, updateData);

    if (error) throw new ApiError(500, error.message);
    if (!data) throw new ApiError(404, 'Licença não encontrada.');
    return ok(res, data);
  } catch (err) {
    return handleError(res, err);
  }
});

/** PATCH /api/licenses/admin/:id — Atualização parcial ou alternância de status */
licensesRouter.patch('/admin/:id', requireAuth, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = req.params;

    const { data: currentLic } = await supabase
      .from('catalog_licenses')
      .select('*')
      .eq('id', id)
      .single();

    const decodedCurrent = currentLic ? decodeLicenseData(currentLic) : {};

    const updateData: Record<string, any> = {
      expires_at: decodedCurrent.expires_at ?? null,
      scheduled_block_at: decodedCurrent.scheduled_block_at ?? null,
      scheduled_unblock_at: decodedCurrent.scheduled_unblock_at ?? null,
      plan_start_date: decodedCurrent.plan_start_date ?? null,
      billing_cycle_days: decodedCurrent.billing_cycle_days ?? 30
    };

    if (req.body.active !== undefined) updateData.active = Boolean(req.body.active);
    if (req.body.clientName || req.body.client_name) updateData.client_name = req.body.clientName || req.body.client_name;
    if (req.body.licenseKey || req.body.license_key) updateData.license_key = req.body.licenseKey || req.body.license_key;
    if (req.body.domain !== undefined) updateData.domain = req.body.domain;
    if (req.body.message !== undefined) updateData.message = req.body.message;
    if (req.body.supportContact !== undefined || req.body.support_contact !== undefined) {
      updateData.support_contact = req.body.supportContact ?? req.body.support_contact;
    }
    if (req.body.expires_at !== undefined || req.body.expiresAt !== undefined) {
      updateData.expires_at = req.body.expires_at ?? req.body.expiresAt ?? null;
    }
    if (req.body.scheduled_block_at !== undefined || req.body.scheduledBlockAt !== undefined) {
      updateData.scheduled_block_at = req.body.scheduled_block_at ?? req.body.scheduledBlockAt ?? null;
    }
    if (req.body.scheduled_unblock_at !== undefined || req.body.scheduledUnblockAt !== undefined) {
      updateData.scheduled_unblock_at = req.body.scheduled_unblock_at ?? req.body.scheduledUnblockAt ?? null;
    }
    if (req.body.plan_start_date !== undefined || req.body.planStartDate !== undefined) {
      updateData.plan_start_date = req.body.plan_start_date ?? req.body.planStartDate ?? null;
    }
    if (req.body.billing_cycle_days !== undefined || req.body.billingCycleDays !== undefined) {
      updateData.billing_cycle_days = Number(req.body.billing_cycle_days ?? req.body.billingCycleDays ?? 30);
    }

    const { data, error } = await safeSupabaseUpdate(supabase, 'catalog_licenses', id, updateData);

    if (error) throw new ApiError(500, error.message);
    if (!data) throw new ApiError(404, 'Licença não encontrada.');
    return ok(res, data);
  } catch (err) {
    return handleError(res, err);
  }
});

/** DELETE /api/licenses/admin/:id — Deletar licença */
licensesRouter.delete('/admin/:id', requireAuth, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = req.params;
    const { error } = await supabase
      .from('catalog_licenses')
      .delete()
      .eq('id', id);

    if (error) throw new ApiError(500, error.message);
    return ok(res, { deleted: true });
  } catch (err) {
    return handleError(res, err);
  }
});
