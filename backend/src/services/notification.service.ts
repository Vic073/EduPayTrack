import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error-handler';

export type CreateNotificationInput = {
    userId: string;
    title: string;
    message: string;
    type: 'FEE_ASSIGNED' | 'PAYMENT_SUBMITTED' | 'PAYMENT_APPROVED' | 'PAYMENT_REJECTED' | 'SYSTEM' | 'BALANCE_REMINDER';
};

export const createNotification = async (input: CreateNotificationInput) => {
    return prisma.notification.create({
        data: input,
    });
};

export const createBulkNotifications = async (inputs: CreateNotificationInput[]) => {
    return prisma.notification.createMany({
        data: inputs,
    });
};

export const getUserNotifications = async (userId: string, limit = 50) => {
    return prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
};

export const markNotificationRead = async (userId: string, notificationId: string) => {
    const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
    });

    if (!notification) {
        throw new AppError('Notification not found', 404);
    }

    if (notification.userId !== userId) {
        throw new AppError('Unauthorized access to notification', 403);
    }

    return prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
    });
};

export const markAllNotificationsRead = async (userId: string) => {
    return prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
    });
};
