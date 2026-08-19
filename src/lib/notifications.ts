import { prisma } from './prisma';

export type NotificationType =
  | 'ORDER_CREATED'
  | 'ORDER_PAID'
  | 'ORDER_COMPLETED'
  | 'FARMING_STATUS'
  | 'TOPUP_SUCCESS'
  | 'LUCKY_BOX_WIN'
  | 'PROMOTION'
  | 'SYSTEM'
  | 'REFUND';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
}: CreateNotificationParams): Promise<boolean> {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link: link || null,
      },
    });
    return true;
  } catch (error) {
    console.error('[Notification Helper] Failed to create notification:', error);
    return false;
  }
}
