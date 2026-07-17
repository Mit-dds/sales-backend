import prisma from '../config/db.js';
import logger from '../utils/logger.js';
import ApiError from '../utils/apiError.js';
import fs from 'fs';

// ---------- Helpers ----------

export const mapProjectStatus = (project) => {
  if (project && project.status === 'OffPlan') project.status = 'Off-plan';
  return project;
};

const mapProjectStatusArray = (projects) => projects.map(mapProjectStatus);

// ---------- Create Project ----------

export const createProject = async (data) => {
  const project = await prisma.project.create({ data });
  mapProjectStatus(project);
  logger.info(`Project created: ${project.id} - ${project.name}`);
  return project;
};

// ---------- Get All Projects ----------

export const getAllProjects = async ({ page = 1, limit = 20, search, status } = {}) => {
  const where = {};

  if (search && search.trim()) {
    where.name = { contains: search.trim(), mode: 'insensitive' };
  }

  if (status) {
    if (status === 'Off-plan') where.status = 'OffPlan';
    else if (status === 'Ready') where.status = 'Ready';
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        unitTypes: {
          include: {
            subtypes: { orderBy: { createdAt: 'asc' } },
            paymentPlans: { select: { id: true, planType: true, label: true, dp: true, installmentPct: true, discount: true, eventDiscount: true, sortOrder: true }, orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    }),
    prisma.project.count({ where }),
  ]);

  const summary = mapProjectStatusArray(projects).map((p) => {
    const unitTypeCount = p.unitTypes.length;
    const totalPlans = p.unitTypes.reduce((sum, ut) => sum + ut.paymentPlans.length, 0);
    return {
      id: p.id,
      name: p.name,
      location: p.location,
      type: p.type,
      status: p.status,
      completionDate: p.completionDate,
      feePct: p.feePct,
      feeFixed: p.feeFixed,
      utilityAmount: p.utilityAmount,
      parkingCost: p.parkingCost,
      bookingToken: p.bookingToken,
      day7Payment: p.day7Payment,
      primaryColor: p.primaryColor,
      secondaryColor: p.secondaryColor,
      dpSplitOptions: p.dpSplitOptions,
      disclaimer: p.disclaimer,
      unitTypeCount,
      totalPlans,
      unitTypes: p.unitTypes.map((ut) => ({
        id: ut.id,
        label: ut.label,
        subtypes: ut.subtypes.map((st) => ({ id: st.id, label: st.label })),
        paymentPlans: ut.paymentPlans.map((pp) => ({
          id: pp.id,
          planType: pp.planType,
          label: pp.label,
          dp: pp.dp,
          installmentPct: pp.installmentPct,
          discount: pp.discount,
          eventDiscount: pp.eventDiscount,
          sortOrder: pp.sortOrder,
        })),
      })),
      whyBuy: p.whyBuy,
      heroImagePath: p.heroImagePath,
      masterPlanPath: p.masterPlanPath,
    };
  });

  return {
    projects: summary,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ---------- Get Project By Id ----------

export const getProjectById = async (projectId) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      unitTypes: {
        include: {
          subtypes: true,
          paymentPlans: { orderBy: { sortOrder: 'asc' } },
        },
      },
    },
  });

  if (!project) return null;
  return mapProjectStatus(project);
};

// ---------- Update Project ----------

export const updateProject = async (projectId, data) => {
  const existing = await prisma.project.findUnique({ where: { id: projectId } });
  if (!existing) return null;

  const project = await prisma.project.update({
    where: { id: projectId },
    data,
  });

  mapProjectStatus(project);
  logger.info(`Project updated: ${project.id} - ${project.name}`);
  return project;
};

// ---------- Delete Project ----------

export const deleteProject = async (projectId) => {
  const existing = await prisma.project.findUnique({ where: { id: projectId } });
  if (!existing) return null;

  // Delete hero/master-plan files from disk before cascade
  if (existing.heroImagePath) {
    try { fs.unlinkSync(existing.heroImagePath); } catch { /* ignore */ }
  }
  if (existing.masterPlanPath) {
    try { fs.unlinkSync(existing.masterPlanPath); } catch { /* ignore */ }
  }

  // Also delete floor plan files from subtypes
  const unitTypes = await prisma.unitType.findMany({
    where: { projectId },
    include: { subtypes: true },
  });
  for (const ut of unitTypes) {
    for (const st of ut.subtypes) {
      if (st.floorPlanPath) {
        try { fs.unlinkSync(st.floorPlanPath); } catch { /* ignore */ }
      }
    }
  }

  await prisma.project.delete({ where: { id: projectId } });
  logger.info(`Project deleted: ${projectId}`);
  return true;
};

// ---------- Upload Project File ----------

export const uploadProjectFile = async (projectId, type, file) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    if (file) try { fs.unlinkSync(file.path); } catch { /* ignore */ }
    return null;
  }

  const oldPath = type === 'hero' ? project.heroImagePath : project.masterPlanPath;
  if (oldPath) {
    try { fs.unlinkSync(oldPath); } catch (e) { logger.warn(`Could not delete old ${type} file: ${e.message}`); }
  }

  const updateData = {};
  if (type === 'hero') {
    updateData.heroImagePath = file.path;
  } else if (type === 'master-plan') {
    updateData.masterPlanPath = file.path;
    updateData.masterPlanName = file.originalname;
    updateData.masterPlanIsImage = file.mimetype.startsWith('image/');
  }

  const updated = await prisma.project.update({ where: { id: projectId }, data: updateData });
  return updated;
};

// ---------- Delete Project File ----------

export const deleteProjectFile = async (projectId, type) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;

  const oldPath = type === 'hero' ? project.heroImagePath : project.masterPlanPath;
  if (oldPath) {
    try { fs.unlinkSync(oldPath); } catch (e) { logger.warn(`Could not delete old ${type} file: ${e.message}`); }
  }

  const updateData = {};
  if (type === 'hero') {
    updateData.heroImagePath = null;
  } else if (type === 'master-plan') {
    updateData.masterPlanPath = null;
    updateData.masterPlanName = null;
    updateData.masterPlanIsImage = null;
  }

  const updated = await prisma.project.update({ where: { id: projectId }, data: updateData });
  return updated;
};

// ---------- Get Master Plan ----------

export const getMasterPlan = async (projectId) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { heroImagePath: true, masterPlanPath: true, masterPlanName: true, masterPlanIsImage: true },
  });
  if (!project) return null;
  return project;
};

// ---------- Get Why Buy ----------

export const getWhyBuy = async (projectId) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { whyBuy: true },
  });
  if (!project) return null;
  return project.whyBuy;
};

// ---------- Add Why Buy Items (POST - replace all) ----------

export const addWhyBuyItem = async (projectId, items) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { whyBuy: items },
  });

  logger.info(`WhyBuy items replaced for project ${projectId}: ${items.length} items`);
  return updated;
};

// ---------- Remove Why Buy Item (DELETE - by index) ----------

export const removeWhyBuyItem = async (projectId, index) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;

  if (index < 0 || index >= project.whyBuy.length) {
    throw new ApiError(400, `Index ${index} is out of bounds. WhyBuy has ${project.whyBuy.length} items`);
  }

  const updatedWhyBuy = [...project.whyBuy];
  updatedWhyBuy.splice(index, 1);

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { whyBuy: updatedWhyBuy },
  });

  logger.info(`WhyBuy item removed at index ${index} for project ${projectId}`);
  return updated;
};

// ---------- Get Why Buy AI Suggestions (moved to ai.service.js) ----------
