import { UserRole } from '../generated/prisma';
import { NextFunction, Request, Response } from 'express';

import { prisma } from '../lib/prisma';
import { AppError } from './error-handler';
import { extractTokenFromAuthSources, verifyToken } from '../utils/auth';

export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractTokenFromAuthSources(req.headers.authorization, req.headers.cookie);

    if (!token) {
        return next(new AppError('Authentication required', 401));
    }

    try {
        const decoded = verifyToken(token);
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                role: true,
                status: true,
                currentSessionId: true,
                sessionExpires: true,
                student: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        if (!user) {
            return next(new AppError('User not found', 401, 'SESSION_USER_MISSING'));
        }

        if (user.status !== 'ACTIVE') {
            return next(new AppError('Account is not active', 403, 'ACCOUNT_INACTIVE'));
        }

        if (!user.currentSessionId || user.currentSessionId !== decoded.sessionId) {
            return next(new AppError('Session is no longer active. Please sign in again.', 401, 'SESSION_REVOKED'));
        }

        if (!user.sessionExpires || user.sessionExpires <= new Date()) {
            return next(new AppError('Session expired. Please sign in again.', 401, 'SESSION_EXPIRED'));
        }

        req.user = {
            userId: user.id,
            email: user.email,
            role: user.role,
            studentId: user.student?.id,
            sessionId: decoded.sessionId,
        };
        next();
    } catch (error) {
        if (error instanceof AppError) {
            return next(error);
        }

        next(new AppError('Invalid or expired token', 401));
    }
};

export const requireRole =
    (...roles: UserRole[]) =>
    (req: Request, _res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new AppError('Authentication required', 401));
        }

        if (!roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to access this resource', 403));
        }

        next();
    };
