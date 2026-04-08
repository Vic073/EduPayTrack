import { UserRole } from '../generated/prisma';
import { Router } from 'express';

import { asyncHandler } from '../lib/async-handler';
import { requireAuth, requireRole } from '../middleware/auth';
import { getStudentDashboard } from '../services/student.service';
import {
    generateStudentClearanceLetterPdf,
    generateStudentStatementPdf,
    getStudentDocumentFilename,
    getStudentDocumentPayloadByUserId,
} from '../services/document.service';

export const studentRouter = Router();

studentRouter.use(requireAuth);

studentRouter.get(
    '/me',
    requireRole(UserRole.STUDENT),
    asyncHandler(async (req, res) => {
        const dashboard = await getStudentDashboard(req.user!.userId);
        res.status(200).json(dashboard);
    })
);

studentRouter.get(
    '/me/statement.pdf',
    requireRole(UserRole.STUDENT),
    asyncHandler(async (req, res) => {
        const payload = await getStudentDocumentPayloadByUserId(req.user!.userId);
        const pdf = await generateStudentStatementPdf(payload.student.id);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${getStudentDocumentFilename('statement', payload.student)}"`);
        res.status(200).send(pdf);
    })
);

studentRouter.get(
    '/me/clearance-letter.pdf',
    requireRole(UserRole.STUDENT),
    asyncHandler(async (req, res) => {
        const payload = await getStudentDocumentPayloadByUserId(req.user!.userId);
        const pdf = await generateStudentClearanceLetterPdf(payload.student.id);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${getStudentDocumentFilename('clearance-letter', payload.student)}"`);
        res.status(200).send(pdf);
    })
);
