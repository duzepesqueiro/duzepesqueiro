import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  postgres: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME || 'duzepesqueiro',
    url: process.env.DATABASE_URL,
  },
  mongodb: {
    host: process.env.MONGO_HOST || 'localhost',
    port: parseInt(process.env.MONGO_PORT ?? '27017', 10) || 27017,
    user: process.env.MONGO_USER,
    password: process.env.MONGO_PASSWORD,
    name: process.env.MONGO_DB || 'duzepesqueiro_logs',
    url: process.env.MONGODB_URL || process.env.MONGO_URI,
  },
}));
