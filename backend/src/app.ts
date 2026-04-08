import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';

import { corsOrigins, env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { apiRouter } from './routes';

dotenv.config();

export const app = express();

app.set('trust proxy', 1);

// Security headers
app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || env.NODE_ENV !== 'production' || corsOrigins.includes(origin)) {
                callback(null, true);
                return;
            }

            callback(new Error('Origin not allowed by CORS'));
        },
        credentials: true,
    })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Standard API response formatter middleware
app.use((_req, res, next) => {
    const originalJson = res.json;
    res.json = function (body) {
        // If the body is already in the standard format with the 'success' property explicitly defined, don't double-wrap.
        // Also don't wrap if it's not an object (though json usually is).
        if (body && typeof body === 'object' && body.hasOwnProperty('success')) {
            return originalJson.call(this, body);
        }

        const success = res.statusCode >= 200 && res.statusCode < 300;
        
        let message = !success && body?.message ? body.message : undefined;
        // if success but body contains message string
        if (success && body?.message && Object.keys(body).length === 1) {
            message = body.message;
            body = undefined;
        }

        return originalJson.call(this, {
            success,
            ...(success && body !== undefined ? { data: body } : {}),
            ...(!success && body?.errors ? { data: body, errors: body.errors } : {}),
            ...(message ? { message } : {})
        });
    };
    next();
});

app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
