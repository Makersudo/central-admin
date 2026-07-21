import type { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../lib/supabase.js';
import { ApiError, handleError } from '../lib/http.js';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

/**
 * Middleware para validar o token JWT de autenticação do administrador no Supabase.
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Autenticação necessária (token não fornecido).');
    }

    const token = authHeader.substring(7);
    const supabase = getSupabaseAdmin();
    
    // Valida o token do usuário diretamente com o Supabase Auth da Central
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new ApiError(401, 'Sessão inválida ou expirada.');
    }

    // Verifica autorização de privilégio (apenas e-mail admin cadastrado é permitido)
    const { env } = await import('../config/env.js');
    if (user.email !== env.adminEmail) {
      throw new ApiError(403, 'Acesso não autorizado: Privilégios administrativos insuficientes.');
    }

    // Passa o usuário autenticado adiante
    req.user = user;
    next();
  } catch (err) {
    return handleError(res, err);
  }
}
