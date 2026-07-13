import prisma from '../config/db.js';
import logger from '../utils/logger.js';

export const createOffer = async (data, agent) => {
  const offer = await prisma.offer.create({
    data: {
      projectId: data.projectId || null,
      projectName: data.projectName,
      unitId: data.unitId || null,
      unitNumber: data.unitNumber,
      unitType: data.unitType || null,
      subType: data.subType || null,
      planId: data.planId || null,
      planLabel: data.planLabel,
      offerMode: data.offerMode || 'normal',
      isEvent: data.isEvent || false,
      clientName: data.clientName,
      clientPhone: data.clientPhone || null,
      listPrice: data.listPrice,
      discount: data.discount || 0,
      netPrice: data.netPrice,
      extraDiscount: data.extraDiscount || 0,
      day7Payment: data.day7Payment || 0,
      currency: data.currency || null,
      exchangeRate: data.exchangeRate || null,
      schedule: data.schedule || [],
      fees: data.fees || {},
      type: data.type || 'single',
      action: data.action || 'generated',
      agentId: agent.id,
      agentName: agent.name,
      agentPhone: agent.phone || null,
      agentEmail: agent.profileEmail || agent.email,
      agentToggles: data.agentToggles || {},
    },
  });

  logger.info(`Offer created: ${offer.id} by agent ${agent.id}`);
  return offer;
};

export const getAllOffers = async ({
  agentId,
  isAdmin,
  page = 1,
  limit = 20,
  search,
  projectId,
  offerMode,
  agentName,
  sortBy = 'createdAt',
  sortDir = 'desc',
} = {}) => {
  const where = {};

  if (!isAdmin && agentId) {
    where.agentId = agentId;
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { clientName: { contains: q, mode: 'insensitive' } },
      { unitNumber: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (projectId) {
    if (/^cm[a-z0-9]{20,}$/.test(projectId)) {
      where.projectId = projectId;
    } else {
      where.projectName = { contains: projectId, mode: 'insensitive' };
    }
  }

  if (offerMode) {
    where.offerMode = offerMode;
  }

  if (agentName && agentName.trim()) {
    where.agentName = { contains: agentName.trim(), mode: 'insensitive' };
  }

  const allowedSorts = ['createdAt', 'clientName', 'projectName', 'netPrice'];
  const safeSortBy = allowedSorts.includes(sortBy) ? sortBy : 'createdAt';
  const safeSortDir = sortDir === 'asc' ? 'asc' : 'desc';

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [offers, total, thisMonth, singleOffers, multiPlan] = await Promise.all([
    prisma.offer.findMany({
      where,
      orderBy: { [safeSortBy]: safeSortDir },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        createdAt: true,
        agentId: true,
        agentName: true,
        clientName: true,
        clientPhone: true,
        projectName: true,
        unitNumber: true,
        unitType: true,
        planLabel: true,
        offerMode: true,
        discount: true,
        netPrice: true,
        type: true,
        action: true,
      },
    }),
    prisma.offer.count({ where }),
    prisma.offer.count({ where: { ...where, createdAt: { gte: startOfMonth } } }),
    prisma.offer.count({ where: { ...where, type: 'single' } }),
    prisma.offer.count({ where: { ...where, type: { not: 'single' } } }),
  ]);

  return {
    offers: offers.map((o) => ({
      id: o.id,
      date: o.createdAt,
      agentId: o.agentId,
      agentName: o.agentName,
      clientName: o.clientName,
      clientPhone: o.clientPhone,
      projectName: o.projectName,
      unitNumber: o.unitNumber,
      unitType: o.unitType,
      planLabel: o.planLabel,
      offerMode: o.offerMode,
      discount: o.discount,
      netPrice: o.netPrice,
      type: o.type,
      action: o.action,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    stats: {
      totalOffers: total,
      thisMonth,
      singleOffers,
      multiPlan,
    },
  };
};
