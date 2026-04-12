interface UserBaseEventPayload {
  timestamp: Date;
  triggeredBy: string;
}

export interface UserRegisteredPayload extends UserBaseEventPayload {
  userId: string;
  email: string;
  name: string;
  requiresEmailConfirmation: boolean;
  confirmationCode: string;
}

export interface UserActivatedPayload extends UserBaseEventPayload {
  userId: string;
  email: string;
  name: string;
}

export interface NotificationSendPayload extends UserBaseEventPayload {
  userId: string;
  type: 'email' | 'push' | 'websocket';
  template: string;
  data: Record<string, any>;
}
