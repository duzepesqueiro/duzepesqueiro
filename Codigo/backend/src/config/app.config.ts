import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: (() => {
    const parsed = Number.parseInt(process.env.PORT ?? '3000', 10);
    return Number.isNaN(parsed) ? 3000 : parsed;
  })(),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  adminUrl: process.env.ADMIN_URL || 'http://localhost:5174',
}));
