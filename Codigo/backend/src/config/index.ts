import appConfig from './app.config';
import databaseConfig from './database.config';
import jwtConfig from './jwt.config';
import mercadoPagoConfig from '../application/payment/providers/mercadopago/mercadopago.config';

export default [appConfig, databaseConfig, jwtConfig, mercadoPagoConfig];
