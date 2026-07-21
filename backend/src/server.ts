import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { licensesRouter } from './routes/licenses.js';
import { handleError, ok } from './lib/http.js';
import { getSupabaseAdmin } from './lib/supabase.js';

const app = express();

app.disable('x-powered-by');

app.use(cors({
  origin(origin, callback) {
    if (!origin || env.nodeEnv === 'development' || env.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origem não autorizada pela Central CORS.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());

// Middleware de Observabilidade (Logging Estruturado e Métricas de Latência)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Endpoint de Saúde
app.get('/api/health', (_req, res) => {
  let dbOk = false;
  try {
    getSupabaseAdmin();
    dbOk = true;
  } catch (err) {
    dbOk = false;
  }

  return ok(res, {
    status: 'ok',
    service: 'central-admin-backend',
    databaseConnected: dbOk
  });
});

// Registrar rotas
app.use('/api/licenses', licensesRouter);

// Tratamento global de erros
app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  return handleError(res, error);
});

app.listen(Number(env.port), '0.0.0.0', () => {
  console.log(`Central Admin Backend listening on port ${env.port}`);
});
