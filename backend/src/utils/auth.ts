import { UserRole } from '../generated/prisma';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';

export type AuthTokenPayload = {
    userId: string;
    email: string;
    role: UserRole;
    studentId?: string;
    sessionId: string;
};

export const createToken = (payload: AuthTokenPayload) => {
    return jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: '12h',
    });
};

export const verifyToken = (token: string) => {
    return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
};
