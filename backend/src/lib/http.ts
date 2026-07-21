import type { Response } from 'express';

export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export function ok(res: Response, data: any, statusCode = 200) {
  return res.status(statusCode).json(data);
}

export function handleError(res: Response, err: unknown) {
  console.error(err);
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  return res.status(500).json({ error: 'Erro interno no servidor da Central.' });
}

export function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, `O campo '${fieldName}' é obrigatório e deve ser uma string.`);
  }
  return value.trim();
}

export function optionalString(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim();
}
