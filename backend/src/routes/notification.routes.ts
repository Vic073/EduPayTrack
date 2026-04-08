import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { requireAuth, requireRole } from '../middleware/auth';
import { UserRole } from '../generated/prisma';
import {
    getUserNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    createBulkNotifications,
} from '../services/notification.service';
import { prisma } from '../lib/prisma';

export const notificationRouter = Router();

notificationRouter.use(requireAuth);

// Get my notifications
notificationRouter.get(
    '/',
    asyncHandler(async (req, res) => {
        const notifications = await getUserNotifications(req.user!.userId);
        res.status(200).json(notifications);
    })
);

// Mark a single notification read
notificationRouter.patch(
    '/:id/read',
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const notification = await markNotificationRead(req.user!.userId, id);
        res.status(200).json(notification);
    })
);

// Mark all read
notificationRouter.patch(
    '/read-all',
    asyncHandler(async (req, res) => {
        await markAllNotificationsRead(req.user!.userId);
        res.status(200).json({ message: 'All notifications marked as read' });
    })
);

// Admin trigger to send balance reminders
notificationRouter.post(
    '/admin-send',
    requireRole(UserRole.ADMIN, UserRole.ACCOUNTS),
    asyncHandler(async (req, res) => {
        const { studentIds } = req.body;
        
        let students = [];
        if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
            students = await prisma.student.findMany({
                where: { id: { in: studentIds } },
            });
        } else {
            // Target all students with a positive balance
            students = await prisma.student.findMany({
                where: { currentBalance: { gt: 0 } },
            });
        }

        const notifications = students.map((s) => ({
            userId: s.userId,
            title: 'Fee Balance Reminder',
            message: `Please be reminded that you have an outstanding fee balance of MK ${Number(s.currentBalance).toLocaleString()}. Kindly clear your balance.`,
            type: 'BALANCE_REMINDER' as const,
        }));

        if (notifications.length > 0) {
            await createBulkNotifications(notifications);
        }

        res.status(200).json({ message: `Sent ${notifications.length} reminders.` });
    })
);
