import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import type { Prisma } from '../generated/prisma/index';
import { prisma } from '../lib/prisma';

const logsDirectory = path.resolve(process.cwd(), 'logs');
const auditLogPath = path.join(logsDirectory, 'audit.log');

export type AuditStatus = 'VERIFIED' | 'FAILED' | 'SYSTEM_REJECTED' | 'SUCCESS';

export type AuditActor = {
    userId?: string;
    email?: string;
    role?: string;
    ipAddress?: string;
};

export type AuditLogEntry = {
    id: string;
    timestamp: string;
    action: string;
    actor?: AuditActor;
    targetType?: string;
    targetId?: string;
    status?: AuditStatus;
    reason?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
};

const ensureLogDirectory = () => {
    if (!fs.existsSync(logsDirectory)) {
        fs.mkdirSync(logsDirectory, { recursive: true });
    }
};

const extractString = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim().length > 0 ? value : undefined;

const readLegacyAuditLogs = (limit = 100): AuditLogEntry[] => {
    ensureLogDirectory();

    if (!fs.existsSync(auditLogPath)) {
        return [];
    }

    const contents = fs.readFileSync(auditLogPath, 'utf8');

    return contents
        .split('\n')
        .filter(Boolean)
        .slice(-limit)
        .reverse()
        .map((line) => JSON.parse(line) as AuditLogEntry);
};

const appendLegacyAuditLog = (record: AuditLogEntry) => {
    ensureLogDirectory();
    fs.appendFileSync(auditLogPath, `${JSON.stringify(record)}\n`, 'utf8');
};

const normalizeRecord = (entry: Omit<Partial<AuditLogEntry>, 'timestamp' | 'id'>): AuditLogEntry => {
    const rawDetails = entry.details ?? {};
    const details = rawDetails && typeof rawDetails === 'object' ? rawDetails as Record<string, unknown> : {};
    const ipAddress = entry.ipAddress ?? entry.actor?.ipAddress ?? extractString(details.ipAddress);
    const userAgent = entry.userAgent ?? extractString(details.userAgent);
    const sessionId = entry.sessionId ?? extractString(details.sessionId);

    return {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        action: entry.action || 'unknown',
        actor: entry.actor,
        targetType: entry.targetType,
        targetId: entry.targetId,
        status: entry.status || 'SUCCESS',
        reason: entry.reason,
        details,
        ipAddress,
        userAgent,
        sessionId,
    };
};

export const writeAuditLog = async (entry: Omit<Partial<AuditLogEntry>, 'timestamp' | 'id'>) => {
    const record = normalizeRecord(entry);

    try {
        await prisma.auditLog.create({
            data: {
                id: record.id,
                timestamp: new Date(record.timestamp),
                action: record.action,
                actorUserId: record.actor?.userId,
                actorEmail: record.actor?.email,
                actorRole: record.actor?.role,
                ipAddress: record.ipAddress,
                userAgent: record.userAgent,
                sessionId: record.sessionId,
                targetType: record.targetType,
                targetId: record.targetId,
                status: record.status || 'SUCCESS',
                reason: record.reason,
                details: (record.details || undefined) as Prisma.InputJsonValue | undefined,
            },
        });
        return;
    } catch {
        appendLegacyAuditLog(record);
    }
};

export const readAuditLogs = async (limit = 100): Promise<AuditLogEntry[]> => {
    try {
        const logs = await prisma.auditLog.findMany({
            orderBy: {
                timestamp: 'desc',
            },
            take: limit,
        });

        return logs.map((log) => ({
            id: log.id,
            timestamp: log.timestamp.toISOString(),
            action: log.action,
            actor:
                log.actorUserId || log.actorEmail || log.actorRole || log.ipAddress
                    ? {
                          userId: log.actorUserId || undefined,
                          email: log.actorEmail || undefined,
                          role: log.actorRole || undefined,
                          ipAddress: log.ipAddress || undefined,
                      }
                    : undefined,
            targetType: log.targetType || undefined,
            targetId: log.targetId || undefined,
            status: (log.status as AuditStatus) || 'SUCCESS',
            reason: log.reason || undefined,
            details:
                log.details && typeof log.details === 'object' && !Array.isArray(log.details)
                    ? (log.details as Record<string, unknown>)
                    : {},
            ipAddress: log.ipAddress || undefined,
            userAgent: log.userAgent || undefined,
            sessionId: log.sessionId || undefined,
        }));
    } catch {
        return readLegacyAuditLogs(limit);
    }
};

/**
 * Delete audit logs by timestamp range or specific entries
 * Useful for manual deletion with proper authorization checks
 */
export const deleteAuditLogs = async (filter: {
    before?: string;
    after?: string;
    action?: string;
    userId?: string;
    ids?: string[];
    manual?: boolean;
}): Promise<{ deleted: number; message: string }> => {
    const hasExplicitFilters =
        Boolean(filter.before) ||
        Boolean(filter.after) ||
        Boolean(filter.action) ||
        Boolean(filter.userId) ||
        Boolean(filter.ids?.length);

    try {
        if (!filter.manual && !hasExplicitFilters) {
            const retained = await prisma.auditLog.count();
            return {
                deleted: 0,
                message: `Deleted 0 audit log entries. Retention: ${retained} entries.`,
            };
        }

        const where = {
            ...(filter.before ? { timestamp: { lt: new Date(filter.before) } } : {}),
            ...(filter.after
                ? {
                      timestamp: {
                          ...(filter.before ? { lt: new Date(filter.before) } : {}),
                          gt: new Date(filter.after),
                      },
                  }
                : {}),
            ...(filter.action ? { action: filter.action } : {}),
            ...(filter.userId ? { actorUserId: filter.userId } : {}),
            ...(filter.ids && filter.ids.length > 0 ? { id: { in: filter.ids } } : {}),
        };

        const result = filter.manual && !hasExplicitFilters
            ? await prisma.auditLog.deleteMany({})
            : await prisma.auditLog.deleteMany({ where });
        const retained = await prisma.auditLog.count();

        return {
            deleted: result.count,
            message: `Deleted ${result.count} audit log entries. Retention: ${retained} entries.`,
        };
    } catch {
        ensureLogDirectory();

        if (!fs.existsSync(auditLogPath)) {
            return { deleted: 0, message: 'No audit logs found' };
        }

        const contents = fs.readFileSync(auditLogPath, 'utf8');
        const logs: AuditLogEntry[] = contents
            .split('\n')
            .filter(Boolean)
            .map((line) => JSON.parse(line) as AuditLogEntry);

        const originalCount = logs.length;
        const filtered = logs.filter((log) => {
            if (filter.ids && filter.ids.length > 0 && filter.ids.includes(log.id)) return false;
            if (filter.before && new Date(log.timestamp) < new Date(filter.before)) return false;
            if (filter.after && new Date(log.timestamp) > new Date(filter.after)) return false;
            if (filter.action && log.action === filter.action) return false;
            if (filter.userId && log.actor?.userId === filter.userId) return false;
            if (filter.manual && !filter.before && !filter.after && !filter.ids && !filter.action && !filter.userId) {
                return false;
            }

            return true;
        });

        const deletedCount = originalCount - filtered.length;
        const newContent = filtered.map((log) => JSON.stringify(log)).join('\n') + (filtered.length > 0 ? '\n' : '');
        fs.writeFileSync(auditLogPath, newContent, 'utf8');

        return {
            deleted: deletedCount,
            message: `Deleted ${deletedCount} audit log entries. Retention: ${filtered.length} entries.`,
        };
    }
};
