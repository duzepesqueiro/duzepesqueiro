import { AsyncLocalStorage } from 'async_hooks';

export type RequestContextStore = {
  requestId: string;
};

export const requestContext = new AsyncLocalStorage<RequestContextStore>();

