import prisma from '../config/db.js';
import ApiError from '../utils/apiError.js';
import logger from '../utils/logger.js';
import path from 'path';
import fs from 'fs';

const TEMPLATE_PLANS = [
  { id: 'tpl-10dp-1pct', label: '10% DP + 1% Monthly + Balance on Completion', dp: 10, installmentPct: 1, durationType: 'till_handover', durationMonths: null, discount: 5, planType: 'normal', eventName: null, eventDiscount: null, eventInstallmentPct: null, eventDurationType: 'till_handover', eventDurationMonths: null },
  { id: 'tpl-15dp-1pct', label: '15% DP + 1% Monthly + Balance on Completion', dp: 15, installmentPct: 1, durationType: 'till_handover', durationMonths: null, discount: 7.5, planType: 'normal', eventName: null, eventDiscount: null, eventInstallmentPct: null, eventDurationType: 'till_handover', eventDurationMonths: null },
  { id: 'tpl-20dp-1pct', label: '20% DP + 1% Monthly + Balance on Completion', dp: 20, installmentPct: 1, durationType: 'till_handover', durationMonths: null, discount: 10, planType: 'normal', eventName: null, eventDiscount: null, eventInstallmentPct: null, eventDurationType: 'till_handover', eventDurationMonths: null },
  { id: 'tpl-30dp-1pct', label: '30% DP + 1% Monthly + Balance on Completion', dp: 30, installmentPct: 1, durationType: 'till_handover', durationMonths: null, discount: 15, planType: 'normal', eventName: null, eventDiscount: null, eventInstallmentPct: null, eventDurationType: 'till_handover', eventDurationMonths: null },
  { id: 'tpl-30dp-70oc', label: '30% DP + 70% On Completion', dp: 30, installmentPct: 0, durationType: 'till_handover', durationMonths: null, discount: 5, planType: 'normal', eventName: null, eventDiscount: null, eventInstallmentPct: null, eventDurationType: 'till_handover', eventDurationMonths: null },
  { id: 'tpl-20dp-80oc', label: '20% DP + 80% On Completion', dp: 20, installmentPct: 0, durationType: 'till_handover', durationMonths: null, discount: 0, planType: 'normal', eventName: null, eventDiscount: null, eventInstallmentPct: null, eventDurationType: 'till_handover', eventDurationMonths: null },
  { id: 'tpl-100dp-inv', label: '100% DP - Investor Deal', dp: 100, installmentPct: 0, durationType: 'till_handover', durationMonths: null, discount: 40, planType: 'normal', eventName: null, eventDiscount: null, eventInstallmentPct: null, eventDurationType: 'till_handover', eventDurationMonths: null },
];

const saveFloorPlanFile = (projectId, subtypeId, file) => {
  const floorPlanDir = path.resolve(`uploads/projects/${projectId}/floor-plans`);
  fs.mkdirSync(floorPlanDir, { recursive: true });
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = path.extname(file.originalname);
  const filename = `${uniqueSuffix}${ext}`;
  const destPath = path.join(floorPlanDir, filename);
  fs.renameSync(file.path, destPath);
  const floorPlanPath = `/uploads/projects/${projectId}/floor-plans/${filename}`;
  const isImage = file.mimetype.startsWith('image/');
  return prisma.subType.update({
    where: { id: subtypeId },
    data: { floorPlanPath, floorPlanName: file.originalname, floorPlanIsImage: isImage },
  });
};

// ---------- API 1: Create Unit Type ----------

export const createUnitType = async (projectId, data) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  let unitType;
  let isUpdate = false;

  if (data.unitTypeId) {
    const existing = await prisma.unitType.findFirst({
      where: { id: data.unitTypeId, projectId },
    });
    if (existing) {
      isUpdate = true;
      unitType = await prisma.unitType.update({
        where: { id: data.unitTypeId },
        data: {
          label: data.label,
          ...(data.virtualTour !== undefined && { virtualTour: data.virtualTour }),
        },
      });
    }
  }

  if (!isUpdate) {
    unitType = await prisma.unitType.create({
      data: {
        projectId,
        label: data.label,
        virtualTour: data.virtualTour,
      },
      include: { subtypes: true, paymentPlans: true },
    });
  }

  const unitTypeId = unitType.id;

  const processedSubtypes = [];
  for (const item of data.subtypes) {
    let subtype;
    if (item.id) {
      subtype = await prisma.subType.update({
        where: { id: item.id },
        data: { label: item.label },
      });
    } else {
      subtype = await prisma.subType.create({
        data: { unitTypeId, label: item.label },
      });
    }
    processedSubtypes.push(subtype);
  }

  for (let i = 0; i < data.subtypes.length; i++) {
    const item = data.subtypes[i];
    const subtypeId = processedSubtypes[i].id;
    const file = item.floorPlan;

    const subtypeRecord = await prisma.subType.findUnique({
      where: { id: subtypeId },
    });

    if (file) {
      if (subtypeRecord?.floorPlanPath) {
        const oldPath = path.resolve(`.${subtypeRecord.floorPlanPath}`);
        try {
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        } catch (err) {
          logger.warn(`Could not delete old floor plan: ${oldPath} - ${err.message}`);
        }
      }
      await saveFloorPlanFile(projectId, subtypeId, file);
    } else if (item.clearFloorPlan && subtypeRecord?.floorPlanPath) {
      const filePath = path.resolve(`.${subtypeRecord.floorPlanPath}`);
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (err) {
        logger.warn(`Could not delete floor plan file: ${filePath} - ${err.message}`);
      }
      await prisma.subType.update({
        where: { id: subtypeId },
        data: { floorPlanPath: null, floorPlanName: null, floorPlanIsImage: null },
      });
    }
  }

  const updatedUnitType = await prisma.unitType.findUnique({
    where: { id: unitTypeId },
    include: { subtypes: true, paymentPlans: true },
  });

  logger.info(`Unit type ${isUpdate ? 'updated' : 'created'}: ${unitTypeId} - ${data.label} (project ${projectId})`);
  return updatedUnitType;
};

// ---------- Helper: calcHO ----------

const calcHO = (dp, installmentPct, durationType, durationMonths) => {
  if (installmentPct === 0) return +(100 - dp).toFixed(1);
  if (durationType === 'fixed_months') return +Math.max(0, Math.round((100 - dp - installmentPct * durationMonths) * 10) / 10).toFixed(1);
  return 0;
};

// ---------- API 2: Get Unit Type ----------

export const getUnitType = async (projectId, unitTypeId) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  const unitType = await prisma.unitType.findFirst({
    where: { id: unitTypeId, projectId },
    include: {
      subtypes: { orderBy: { createdAt: 'asc' } },
      paymentPlans: { orderBy: { sortOrder: 'asc' } },
    },
  });
  if (!unitType) {
    throw new ApiError(404, 'Unit type not found');
  }

  const plansWithHO = unitType.paymentPlans.map((plan) => ({
    ...plan,
    onHandover: calcHO(plan.dp, plan.installmentPct, plan.durationType, plan.durationMonths),
  }));

  return { ...unitType, paymentPlans: plansWithHO };
};

// ---------- API 3: Update Unit Type (label/virtualTour only) ----------

export const updateUnitType = async (projectId, unitTypeId, data) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  const unitType = await prisma.unitType.findFirst({
    where: { id: unitTypeId, projectId },
  });
  if (!unitType) {
    throw new ApiError(404, 'Unit type not found');
  }

  const updated = await prisma.unitType.update({
    where: { id: unitTypeId },
    data: {
      ...(data.label !== undefined && { label: data.label }),
      ...(data.virtualTour !== undefined && { virtualTour: data.virtualTour }),
    },
    include: { subtypes: { orderBy: { createdAt: 'asc' } }, paymentPlans: { orderBy: { sortOrder: 'asc' } } },
  });

  logger.info(`Unit type updated: ${updated.id} - ${updated.label} (project ${projectId})`);
  return updated;
};

// ---------- API 4: Delete Unit Type ----------

export const deleteUnitType = async (projectId, unitTypeId) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  const unitType = await prisma.unitType.findFirst({
    where: { id: unitTypeId, projectId },
    include: { subtypes: true },
  });
  if (!unitType) {
    throw new ApiError(404, 'Unit type not found');
  }

  for (const subtype of unitType.subtypes) {
    if (subtype.floorPlanPath) {
      const filePath = path.resolve(`.${subtype.floorPlanPath}`);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        logger.warn(`Could not delete floor plan file: ${filePath} - ${err.message}`);
      }
    }
  }

  await prisma.unitType.delete({ where: { id: unitTypeId } });

  logger.info(`Unit type deleted: ${unitTypeId} - ${unitType.label} (project ${projectId})`);
};

// ---------- API 5: Get All Unit Types (Summary) ----------

export const getAllUnitTypes = async (projectId) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  const unitTypes = await prisma.unitType.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
    include: {
      subtypes: {
        orderBy: { createdAt: 'asc' },
        select: {
          label: true,
          floorPlanPath: true,
        },
      },
      paymentPlans: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return unitTypes.map((ut) => ({
    id: ut.id,
    label: ut.label,
    subtypes: ut.subtypes.map((st) => ({
      label: st.label,
      hasFloorPlan: !!st.floorPlanPath,
    })),
    paymentPlans: ut.paymentPlans,
  }));
};

// ---------- API 6: Delete SubType ----------

export const deleteSubType = async (projectId, unitTypeId, subTypeId) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  const unitType = await prisma.unitType.findFirst({
    where: { id: unitTypeId, projectId },
  });
  if (!unitType) {
    throw new ApiError(404, 'Unit type not found');
  }

  const subtype = await prisma.subType.findFirst({
    where: { id: subTypeId, unitTypeId },
  });
  if (!subtype) {
    throw new ApiError(404, 'Subtype not found');
  }

  if (subtype.floorPlanPath) {
    const filePath = path.resolve(`.${subtype.floorPlanPath}`);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      logger.warn(`Could not delete floor plan file: ${filePath} - ${err.message}`);
    }
  }

  await prisma.subType.delete({ where: { id: subTypeId } });

  logger.info(`Subtype deleted: ${subTypeId} - "${subtype.label}" (unit type ${unitTypeId})`);
};

// ---------- API 7: Batch Update SubTypes (rename + create + reorder) ----------

export const batchUpdateSubTypes = async (projectId, unitTypeId, data) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  const unitType = await prisma.unitType.findFirst({
    where: { id: unitTypeId, projectId },
  });
  if (!unitType) {
    throw new ApiError(404, 'Unit type not found');
  }

  const existingSubTypes = await prisma.subType.findMany({
    where: { unitTypeId },
  });
  const existingMap = new Map(existingSubTypes.map((st) => [st.id, st]));

  for (let i = 0; i < data.subtypes.length; i++) {
    const item = data.subtypes[i];
    if (item.id) {
      if (!existingMap.has(item.id)) {
        throw new ApiError(404, `Subtype with id ${item.id} not found`);
      }
      await prisma.subType.update({
        where: { id: item.id },
        data: { label: item.label },
      });
    } else {
      await prisma.subType.create({
        data: { unitTypeId, label: item.label },
      });
    }
  }

  const updated = await prisma.subType.findMany({
    where: { unitTypeId },
    orderBy: { createdAt: 'asc' },
  });

  for (let i = 0; i < data.subtypes.length; i++) {
    const item = data.subtypes[i];
    const file = item.floorPlan;
    const subtypeId = updated[i]?.id;
    if (!subtypeId) continue;

    const existing = existingMap.get(subtypeId);

    if (file) {
      if (existing?.floorPlanPath) {
        const oldPath = path.resolve(`.${existing.floorPlanPath}`);
        try {
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        } catch (err) {
          logger.warn(`Could not delete old floor plan: ${oldPath} - ${err.message}`);
        }
      }
      await saveFloorPlanFile(projectId, subtypeId, file);
    } else if (item.clearFloorPlan && existing?.floorPlanPath) {
      const filePath = path.resolve(`.${existing.floorPlanPath}`);
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (err) {
        logger.warn(`Could not delete floor plan file: ${filePath} - ${err.message}`);
      }
      await prisma.subType.update({
        where: { id: subtypeId },
        data: { floorPlanPath: null, floorPlanName: null, floorPlanIsImage: null },
      });
    }
  }

  const finalUpdated = await prisma.subType.findMany({
    where: { unitTypeId },
    orderBy: { createdAt: 'asc' },
  });

  logger.info(`Subtypes batch updated for unit type ${unitTypeId}: ${finalUpdated.length} subtypes`);
  return finalUpdated;
};

// ---------- API 8: Get Template Plans ----------

export const getTemplatePlans = async () => {
  return TEMPLATE_PLANS;
};

// ---------- API 9: Save Payment Plans (Bulk) ----------

export const savePaymentPlans = async (projectId, unitTypeId, plans) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  const unitType = await prisma.unitType.findFirst({
    where: { id: unitTypeId, projectId },
  });
  if (!unitType) {
    throw new ApiError(404, 'Unit type not found');
  }

  const created = await prisma.$transaction(async (tx) => {
    await tx.paymentPlan.deleteMany({ where: { unitTypeId } });

    const records = plans.map((plan, index) => ({
      unitTypeId,
      planType: plan.planType,
      label: plan.label,
      dp: plan.dp,
      installmentPct: plan.installmentPct,
      durationType: plan.durationType,
      durationMonths: plan.durationMonths,
      discount: plan.discount,
      eventName: plan.eventName,
      eventDiscount: plan.eventDiscount,
      eventInstallmentPct: plan.eventInstallmentPct,
      eventDurationType: plan.eventDurationType,
      eventDurationMonths: plan.eventDurationMonths,
      sortOrder: index,
    }));

    for (const record of records) {
      await tx.paymentPlan.create({ data: record });
    }

    return tx.paymentPlan.findMany({
      where: { unitTypeId },
      orderBy: { sortOrder: 'asc' },
    });
  });

  logger.info(`Payment plans saved for unit type ${unitTypeId}: ${created.length} plans`);
  return created;
};

// ---------- API 10: Get Single Payment Plan ----------

export const getPaymentPlan = async (projectId, unitTypeId, planId) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  const unitType = await prisma.unitType.findFirst({
    where: { id: unitTypeId, projectId },
  });
  if (!unitType) {
    throw new ApiError(404, 'Unit type not found');
  }

  const plan = await prisma.paymentPlan.findFirst({
    where: { id: planId, unitTypeId },
  });
  if (!plan) {
    throw new ApiError(404, 'Payment plan not found');
  }

  return {
    ...plan,
    onHandover: calcHO(plan.dp, plan.installmentPct, plan.durationType, plan.durationMonths),
  };
};

// ---------- API 11: Create Single Payment Plan ----------

export const createPaymentPlan = async (projectId, unitTypeId, data) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  const unitType = await prisma.unitType.findFirst({
    where: { id: unitTypeId, projectId },
  });
  if (!unitType) {
    throw new ApiError(404, 'Unit type not found');
  }

  const maxSortOrder = await prisma.paymentPlan.aggregate({
    where: { unitTypeId },
    _max: { sortOrder: true },
  });

  const sortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;
  const onHandover = calcHO(data.dp, data.installmentPct, data.durationType, data.durationMonths);

  const plan = await prisma.paymentPlan.create({
    data: {
      unitTypeId,
      label: data.label,
      dp: data.dp,
      installmentPct: data.installmentPct,
      durationType: data.durationType,
      durationMonths: data.durationMonths,
      discount: data.discount || 0,
      planType: data.planType || 'normal',
      eventName: data.eventName || null,
      eventDiscount: data.eventDiscount != null ? data.eventDiscount : null,
      eventInstallmentPct: data.eventInstallmentPct != null ? data.eventInstallmentPct : null,
      eventDurationType: data.eventDurationType || 'till_handover',
      eventDurationMonths: data.eventDurationMonths != null ? data.eventDurationMonths : null,
      sortOrder,
    },
  });

  logger.info(`Payment plan created: ${plan.id} - ${plan.label} (unit type ${unitTypeId})`);
  return { ...plan, onHandover };
};

// ---------- API 12: Update Single Payment Plan ----------

export const updatePaymentPlan = async (projectId, unitTypeId, planId, data) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  const unitType = await prisma.unitType.findFirst({
    where: { id: unitTypeId, projectId },
  });
  if (!unitType) {
    throw new ApiError(404, 'Unit type not found');
  }

  const existing = await prisma.paymentPlan.findFirst({
    where: { id: planId, unitTypeId },
  });
  if (!existing) {
    throw new ApiError(404, 'Payment plan not found');
  }

  const dp = data.dp ?? existing.dp;
  const installmentPct = data.installmentPct ?? existing.installmentPct;
  const durationType = data.durationType ?? existing.durationType;
  const durationMonths = data.durationMonths ?? existing.durationMonths;
  const onHandover = calcHO(dp, installmentPct, durationType, durationMonths);

  const updated = await prisma.paymentPlan.update({
    where: { id: planId },
    data: {
      ...(data.label !== undefined && { label: data.label }),
      ...(data.dp !== undefined && { dp: data.dp }),
      ...(data.installmentPct !== undefined && { installmentPct: data.installmentPct }),
      ...(data.durationType !== undefined && { durationType: data.durationType }),
      ...(data.durationMonths !== undefined && { durationMonths: data.durationMonths }),
      ...(data.discount !== undefined && { discount: data.discount }),
      ...(data.planType !== undefined && { planType: data.planType }),
      ...(data.eventName !== undefined && { eventName: data.eventName }),
      ...(data.eventDiscount !== undefined && { eventDiscount: data.eventDiscount }),
      ...(data.eventInstallmentPct !== undefined && { eventInstallmentPct: data.eventInstallmentPct }),
      ...(data.eventDurationType !== undefined && { eventDurationType: data.eventDurationType }),
      ...(data.eventDurationMonths !== undefined && { eventDurationMonths: data.eventDurationMonths }),
    },
  });

  logger.info(`Payment plan updated: ${planId} (unit type ${unitTypeId})`);
  return { ...updated, onHandover };
};

// ---------- API 13: Delete Single Payment Plan ----------

export const deletePaymentPlan = async (projectId, unitTypeId, planId) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  const unitType = await prisma.unitType.findFirst({
    where: { id: unitTypeId, projectId },
  });
  if (!unitType) {
    throw new ApiError(404, 'Unit type not found');
  }

  const existing = await prisma.paymentPlan.findFirst({
    where: { id: planId, unitTypeId },
  });
  if (!existing) {
    throw new ApiError(404, 'Payment plan not found');
  }

  await prisma.paymentPlan.delete({ where: { id: planId } });

  logger.info(`Payment plan deleted: ${planId} - "${existing.label}" (unit type ${unitTypeId})`);
};

// ---------- API 14: Upload Floor Plan ----------

export const uploadFloorPlan = async (projectId, unitTypeId, subTypeId, file) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  const unitType = await prisma.unitType.findFirst({
    where: { id: unitTypeId, projectId },
  });
  if (!unitType) {
    throw new ApiError(404, 'Unit type not found');
  }

  const subtype = await prisma.subType.findFirst({
    where: { id: subTypeId, unitTypeId },
  });
  if (!subtype) {
    throw new ApiError(404, 'Subtype not found');
  }

  if (!file) {
    throw new ApiError(400, 'No file uploaded');
  }

  if (subtype.floorPlanPath) {
    const oldPath = path.resolve(`.${subtype.floorPlanPath}`);
    try {
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    } catch (err) {
      logger.warn(`Could not delete old floor plan file: ${oldPath} - ${err.message}`);
    }
  }

  const isImage = file.mimetype.startsWith('image/');
  const floorPlanPath = `/uploads/projects/${projectId}/floor-plans/${file.filename}`;
  const floorPlanName = file.originalname;

  const updated = await prisma.subType.update({
    where: { id: subTypeId },
    data: { floorPlanPath, floorPlanName, floorPlanIsImage: isImage },
  });

  logger.info(`Floor plan uploaded for subtype ${subTypeId}: ${floorPlanName}`);
  return updated;
};

// ---------- API 15: Delete Floor Plan ----------

export const deleteFloorPlan = async (projectId, unitTypeId, subTypeId) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  const unitType = await prisma.unitType.findFirst({
    where: { id: unitTypeId, projectId },
  });
  if (!unitType) {
    throw new ApiError(404, 'Unit type not found');
  }

  const subtype = await prisma.subType.findFirst({
    where: { id: subTypeId, unitTypeId },
  });
  if (!subtype) {
    throw new ApiError(404, 'Subtype not found');
  }

  if (subtype.floorPlanPath) {
    const filePath = path.resolve(`.${subtype.floorPlanPath}`);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      logger.warn(`Could not delete floor plan file: ${filePath} - ${err.message}`);
    }
  }

  const updated = await prisma.subType.update({
    where: { id: subTypeId },
    data: { floorPlanPath: null, floorPlanName: null, floorPlanIsImage: null },
  });

  logger.info(`Floor plan deleted for subtype ${subTypeId}`);
  return updated;
};

// ---------- API 16: Get Floor Plans (All Subtypes) ----------

export const getFloorPlans = async (projectId, unitTypeId) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  const unitType = await prisma.unitType.findFirst({
    where: { id: unitTypeId, projectId },
  });
  if (!unitType) {
    throw new ApiError(404, 'Unit type not found');
  }

  const subtypes = await prisma.subType.findMany({
    where: { unitTypeId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      label: true,
      floorPlanPath: true,
      floorPlanName: true,
      floorPlanIsImage: true,
    },
  });

  return subtypes;
};
