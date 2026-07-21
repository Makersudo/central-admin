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

function parsePayload(body: any) {
  return {
    license_key:     requireString(body.licenseKey ?? body.license_key, 'licenseKey'),
    client_name:     requireString(body.clientName ?? body.client_name, 'clientName'),
    domain:          optionalString(body.domain) ?? null,
    active:          Boolean(body.active ?? true),
    message:         optionalString(body.message) ?? null,
    support_contact: optionalString(body.supportContact ?? body.support_contact) ?? null,
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
    const { data, error } = await supabase
      .from('catalog_licenses')
      .select('*')
      .eq('license_key', key)
      .maybeSingle();

    if (error) throw new ApiError(500, error.message);
    
    if (!data) {
      return ok(res, {
        active: false,
        status: 'not_found',
        message: 'Licença inválida ou não registrada.',
      });
    }

    if (!data.active) {
      return ok(res, {
        active: false,
        status: 'suspended',
        message: data.message || 'Plataforma suspensa por pendências financeiras.',
        supportContact: data.support_contact,
      });
    }

    return ok(res, {
      active: true,
      status: 'active',
      message: 'Licença ativa e válida.',
      clientName: data.client_name,
    });

  } catch (err) {
    return handleError(res, err);
  }
});

// ─── ADMIN (PROTEGIDO) ────────────────────────────────────────────────────────

/** GET /api/licenses/admin — Listar todas as licenças */
licensesRouter.get('/admin', requireAuth, async (_req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('catalog_licenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new ApiError(500, error.message);
    return ok(res, data ?? []);
  } catch (err) {
    return handleError(res, err);
  }
});

/** POST /api/licenses/admin — Criar licença */
licensesRouter.post('/admin', requireAuth, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const payload = parsePayload(req.body);
    const { data, error } = await supabase
      .from('catalog_licenses')
      .insert(payload)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new ApiError(400, 'Esta chave de licença já está em uso.');
      }
      throw new ApiError(500, error.message);
    }
    return ok(res, data, 201);
  } catch (err) {
    return handleError(res, err);
  }
});

/** PUT /api/licenses/admin/:id — Atualizar licença completa */
licensesRouter.put('/admin/:id', requireAuth, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = req.params;
    const payload = parsePayload(req.body);
    const { data, error } = await supabase
      .from('catalog_licenses')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

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
    
    const updateData: Record<string, any> = {};
    if (req.body.active !== undefined) updateData.active = Boolean(req.body.active);
    if (req.body.clientName || req.body.client_name) updateData.client_name = req.body.clientName || req.body.client_name;
    if (req.body.licenseKey || req.body.license_key) updateData.license_key = req.body.licenseKey || req.body.license_key;
    if (req.body.domain !== undefined) updateData.domain = req.body.domain;
    if (req.body.message !== undefined) updateData.message = req.body.message;
    if (req.body.supportContact !== undefined || req.body.support_contact !== undefined) {
      updateData.support_contact = req.body.supportContact ?? req.body.support_contact;
    }

    const { data, error } = await supabase
      .from('catalog_licenses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

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
