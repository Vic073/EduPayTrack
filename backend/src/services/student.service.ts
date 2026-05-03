import { PaymentStatus, type Prisma, type SchoolLevel } from '../generated/prisma';

import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error-handler';
import { recalculateStudentBalance } from '../utils/balance';

const FEE_TYPE_LABELS: Record<string, string> = {
    tuition: 'Tuition',
    hostel: 'Hostel',
    exam: 'Exam',
    library: 'Library',
    other: 'Other',
};

const buildFeeStructureWhere = (student: {
    program?: string | null;
    classLevel?: string | null;
    academicYear?: string | null;
    schoolLevel?: SchoolLevel | null;
}): Prisma.FeeStructureWhereInput => {
    const normalizedProgram = student.program?.trim() || null;
    const normalizedClassLevel = student.classLevel?.trim() || null;
    const normalizedAcademicYear = student.academicYear?.trim() || null;

    return {
        active: true,
        AND: [
            {
                OR: [
                    { program: null },
                    { program: '' },
                    { program: normalizedProgram },
                ],
            },
            {
                OR: [
                    { classLevel: null },
                    { classLevel: '' },
                    { classLevel: normalizedClassLevel },
                ],
            },
            {
                OR: [
                    { academicYear: null },
                    { academicYear: '' },
                    { academicYear: normalizedAcademicYear },
                ],
            },
            {
                ...(student.schoolLevel ? { schoolLevel: student.schoolLevel } : {}),
            },
        ],
    };
};

export const getApplicableFeeStructures = async (studentId: string) => {
    const student = await prisma.student.findUnique({
        where: { id: studentId },
    });

    if (!student) {
        throw new AppError('Student not found', 404);
    }

    return prisma.feeStructure.findMany({
        where: buildFeeStructureWhere(student),
        orderBy: [
            { dueDate: 'asc' },
            { createdAt: 'asc' },
        ],
    });
};

/**
 * Fetch the applicable fee structure deadlines for a student.
 * Uses the same matching logic as balance.ts to find fee structures
 * that apply to this student, then filters to those with a dueDate set.
 */
export const getStudentDeadlines = async (studentId: string) => {
    const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
            payments: {
                where: { status: PaymentStatus.APPROVED },
            },
        },
    });

    if (!student) {
        throw new AppError('Student not found', 404);
    }

    const applicableFeeStructures = (await getApplicableFeeStructures(studentId)).filter(
        (fee) => fee.dueDate !== null
    );

    const totalPaid = student.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalFees = applicableFeeStructures.reduce((sum, f) => sum + Number(f.amount), 0);
    const isFullyPaid = totalPaid >= totalFees && totalFees > 0;

    return applicableFeeStructures.map((fee) => {
        const dueDate = fee.dueDate!;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const dueDateNorm = new Date(dueDate);
        dueDateNorm.setHours(0, 0, 0, 0);
        const diffMs = dueDateNorm.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        let status: 'upcoming' | 'due' | 'overdue' | 'paid' = 'upcoming';
        if (isFullyPaid) {
            status = 'paid';
        } else if (daysRemaining < 0) {
            status = 'overdue';
        } else if (daysRemaining === 0) {
            status = 'due';
        }

        return {
            id: fee.id,
            title: fee.title,
            description: fee.description || undefined,
            dueDate: dueDate.toISOString().split('T')[0],
            amount: Number(fee.amount),
            type: (fee.feeType || 'other') as 'tuition' | 'hostel' | 'exam' | 'library' | 'other',
            status,
            gracePeriodDays: 7, // Default grace period
        };
    });
};

export const getStudentDashboard = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            student: {
                include: {
                    payments: {
                        orderBy: {
                            submittedAt: 'desc',
                        },
                    },
                },
            },
        },
    });

    if (!user?.student) {
        throw new AppError('Student profile not found', 404);
    }

    // Recalculate balance to ensure it's up-to-date
    const updatedStudent = await recalculateStudentBalance(user.student.id);

    const approvedPayments = user.student.payments.filter(
        (payment) => payment.status === 'APPROVED'
    );
    const pendingPayments = user.student.payments.filter(
        (payment) => payment.status === 'PENDING'
    );
    const rejectedPayments = user.student.payments.filter(
        (payment) => payment.status === 'REJECTED'
    );
    const totalPaid = approvedPayments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0
    );
    const installmentCount = approvedPayments.length;

    // Fetch real deadlines from fee structures
    const deadlines = await getStudentDeadlines(user.student.id);
    const applicableFeeStructures = await getApplicableFeeStructures(user.student.id);
    const feeOptionsByType = new Map<string, {
        id: string;
        type: string;
        label: string;
        title: string;
        amount: number;
        dueDate: string | null;
    }>();

    applicableFeeStructures
        .filter((fee) => fee.feeType)
        .forEach((fee) => {
            if (!fee.feeType || feeOptionsByType.has(fee.feeType)) {
                return;
            }

            feeOptionsByType.set(fee.feeType, {
                id: fee.id,
                type: fee.feeType,
                label: FEE_TYPE_LABELS[fee.feeType || 'other'] || fee.feeType,
                title: fee.title,
                amount: Number(fee.amount),
                dueDate: fee.dueDate ? fee.dueDate.toISOString().split('T')[0] : null,
            });
        });

    const feeOptions = Array.from(feeOptionsByType.values());

    return {
        student: updatedStudent,
        summary: {
            totalPaid,
            currentBalance: Number(updatedStudent.currentBalance),
            installmentCount,
            pendingVerifications: pendingPayments.length,
            rejectedSubmissions: rejectedPayments.length,
        },
        payments: user.student.payments,
        deadlines,
        feeOptions,
    };
};
