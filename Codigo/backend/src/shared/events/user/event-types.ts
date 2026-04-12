export const UserEventTypes = {
  USER_REGISTERED: 'user.registered',
  USER_ACTIVATED: 'user.activated',
  USER_DEACTIVATED: 'user.deactivated',
  USER_PASSWORD_RESET: 'user.password.reset',
  NOTIFICATION_SEND: 'notification.send',
} as const;

export type UserEventType = (typeof UserEventTypes)[keyof typeof UserEventTypes];
