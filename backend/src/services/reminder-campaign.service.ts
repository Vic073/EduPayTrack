import { ReminderCampaignStatus, ReminderScheduleType } from '../generated/prisma';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error-handler';
import { createBulkNotifications } from './notification.service';

type CampaignInput = {
    name: string;
    scheduleType: ReminderScheduleType;
    dayOfWeek?: number;
    sendHour: number;
    sendMinute?: number;
    minBalance?: number;
    maxBalance?: number;
    titleTemplate: string;
    messageTemplate: string;
    targetStudentIds?: string[];
};

const normalizeNumber = (value?: number | null) =>
    value === undefined || value === null || Number.isNaN(Number(value)) ? null : Number(value);

const computeNextRunAt = (
    scheduleType: ReminderScheduleType,
    sendHour: number,
    sendMinute: number,
    dayOfWeek?: number | null,
    from = new Date()
) => {
    const next = new Date(from);
    next.setSeconds(0, 0);
    next.setHours(sendHour, sendMinute, 0, 0);

    if (scheduleType === ReminderScheduleType.DAILY) {
      if (next <= from) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    }

    const targetDay = dayOfWeek ?? 1;
    const currentDay = next.getDay();
    let diff = targetDay - currentDay;

    if (diff < 0 || (diff === 0 && next <= from)) {
      diff += 7;
    }

    next.setDate(next.getDate() + diff);
    return next;
};

const renderTemplate = (template: string, student: any) =>
    template
        .replace(/\{\{firstName\}\}/g, student.firstName || 'Student')
        .replace(/\{\{lastName\}\}/g, student.lastName || '')
        .replace(/\{\{studentCode\}\}/g, student.studentCode || '')
        .replace(/\{\{balance\}\}/g, Number(student.currentBalance || 0).toLocaleString());

const getCampaignStudents = async (campaign: any) => {
    const targetStudentIds = Array.isArray(campaign.targetStudentIds) ? campaign.targetStudentIds : [];

    return prisma.student.findMany({
        where: {
            ...(targetStudentIds.length > 0 ? { id: { in: targetStudentIds } } : {}),
            currentBalance: {
                ...(campaign.minBalance !== null && campaign.minBalance !== undefined ? { gte: campaign.minBalance } : {}),
                ...(campaign.maxBalance !== null && campaign.maxBalance !== undefined ? { lte: campaign.maxBalance } : {}),
                gt: 0,
            },
        },
    });
};

export const listReminderCampaigns = async () => {
    return prisma.reminderCampaign.findMany({
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                },
            },
        },
        orderBy: [
            { nextRunAt: 'asc' },
            { createdAt: 'desc' },
        ],
    });
};

export const createReminderCampaign = async (userId: string, input: CampaignInput) => {
    const sendMinute = input.sendMinute ?? 0;
    const nextRunAt = computeNextRunAt(input.scheduleType, input.sendHour, sendMinute, input.dayOfWeek);

    return prisma.reminderCampaign.create({
        data: {
            name: input.name,
            scheduleType: input.scheduleType,
            dayOfWeek: input.scheduleType === ReminderScheduleType.WEEKLY ? input.dayOfWeek ?? 1 : null,
            sendHour: input.sendHour,
            sendMinute,
            minBalance: normalizeNumber(input.minBalance),
            maxBalance: normalizeNumber(input.maxBalance),
            titleTemplate: input.titleTemplate,
            messageTemplate: input.messageTemplate,
            ...(input.targetStudentIds?.length ? { targetStudentIds: input.targetStudentIds } : {}),
            createdBy: userId,
            nextRunAt,
        },
    });
};

export const updateReminderCampaignStatus = async (campaignId: string, status: ReminderCampaignStatus) => {
    const campaign = await prisma.reminderCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
        throw new AppError('Reminder campaign not found', 404);
    }

    return prisma.reminderCampaign.update({
        where: { id: campaignId },
        data: {
            status,
            ...(status === ReminderCampaignStatus.ACTIVE
                ? {
                    nextRunAt: computeNextRunAt(
                        campaign.scheduleType,
                        campaign.sendHour,
                        campaign.sendMinute,
                        campaign.dayOfWeek
                    ),
                }
                : {}),
        },
    });
};

export const runReminderCampaign = async (campaignId: string) => {
    const campaign = await prisma.reminderCampaign.findUnique({
        where: { id: campaignId },
    });

    if (!campaign) {
        throw new AppError('Reminder campaign not found', 404);
    }

    const students = await getCampaignStudents(campaign);
    const notifications = students.map((student) => ({
        userId: student.userId,
        title: renderTemplate(campaign.titleTemplate, student),
        message: renderTemplate(campaign.messageTemplate, student),
        type: 'BALANCE_REMINDER' as const,
    }));

    if (notifications.length > 0) {
        await createBulkNotifications(notifications);
    }

    const nextRunAt = computeNextRunAt(
        campaign.scheduleType,
        campaign.sendHour,
        campaign.sendMinute,
        campaign.dayOfWeek,
        new Date(Date.now() + 60 * 1000)
    );

    const updatedCampaign = await prisma.reminderCampaign.update({
        where: { id: campaignId },
        data: {
            lastRunAt: new Date(),
            nextRunAt,
        },
    });

    return {
        campaign: updatedCampaign,
        sentCount: notifications.length,
    };
};

export const runDueReminderCampaigns = async () => {
    const dueCampaigns = await prisma.reminderCampaign.findMany({
        where: {
            status: ReminderCampaignStatus.ACTIVE,
            nextRunAt: { lte: new Date() },
        },
        orderBy: {
            nextRunAt: 'asc',
        },
    });

    const results = [];
    for (const campaign of dueCampaigns) {
        results.push(await runReminderCampaign(campaign.id));
    }

    return {
        processed: results.length,
        campaigns: results,
    };
};
