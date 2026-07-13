import prisma from '../config/db.js';
import XLSX from 'xlsx';
import logger from '../utils/logger.js';

export const importFromExcel = async (file) => {
  const workbook = XLSX.readFile(file.path);
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

  if (!rows || rows.length === 0) {
    return { projects: [], summary: { totalImported: 0, totalSkipped: 0 } };
  }

  const header = Object.keys(rows[0]);
  logger.info(`[Availability] Excel headers: ${JSON.stringify(header)}`);
  logger.info(`[Availability] Total rows: ${rows.length}`);

  const findCol = (aliases) => {
    const lower = header.map((h) => h.trim().toLowerCase());
    for (const alias of aliases) {
      const idx = lower.findIndex((h) => h === alias.toLowerCase() || h.startsWith(alias.toLowerCase()));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const colIdx = {
    projectName: findCol(['project name', 'project_name', 'project']),
    city: findCol(['city']),
    number: findCol(['unit no', 'unit number', 'unit_no', 'unit', 'number']),
    propertyType: findCol(['property type', 'property_type']),
    type: findCol(['unit type', 'unit_type', 'type']),
    subtype: findCol(['sub type', 'subtype', 'sub_type']),
    placement: findCol(['placement']),
    floor: findCol(['floor']),
    internal: findCol(['internal area', 'internal', 'area_internal']),
    external: findCol(['external area', 'external', 'area_external']),
    total: findCol(['total area', 'total', 'area']),
    price: findCol(['price']),
  };

  logger.info(`[Availability] Column indices: ${JSON.stringify(colIdx)}`);

  if (colIdx.projectName === -1) {
    logger.error('[Availability] Could not find project name column');
    return { projects: [], summary: { totalImported: 0, totalSkipped: rows.length } };
  }

  const allProjects = await prisma.project.findMany({ select: { id: true, name: true, location: true, type: true } });
  const projectMap = {};

  for (const p of allProjects) {
    const nameKey = p.name.trim().toLowerCase();
    const cityKey = `${nameKey}|${p.location.trim().toLowerCase()}`;
    projectMap[cityKey] = p;
    projectMap[nameKey] = p;
  }

  const findProject = (excelName, excelCity) => {
    const nameLower = excelName.toLowerCase().trim();
    if (!projectMap[nameLower]) return null;
    return projectMap[nameLower];
  };

  logger.info(`[Availability] DB projects: ${JSON.stringify(allProjects.map((p) => ({ name: p.name, location: p.location, type: p.type })))}`);

  const matchedProjectIds = new Set();

  for (const row of rows) {
    const projectName = String(row[header[colIdx.projectName]] || '').trim();
    if (!projectName) continue;
    const project = findProject(projectName);
    if (project) matchedProjectIds.add(project.id);
  }

  logger.info(`[Availability] Matched project IDs: ${JSON.stringify([...matchedProjectIds])}`);

  for (const projectId of matchedProjectIds) {
    await prisma.unit.updateMany({
      where: { projectId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  const unitTypeCache = {};

  for (const p of allProjects) {
    const uts = await prisma.unitType.findMany({
      where: { projectId: p.id },
      select: { id: true, label: true },
    });
    unitTypeCache[p.id] = uts;
  }

  let importedCount = 0;
  let skippedCount = 0;
  const skippedReasons = { noProject: 0, noCityMatch: 0, noPropertyTypeMatch: 0, noUnitNumber: 0, noUnitType: 0 };

  const typeMap = { apartment: 'Apartments', townhouse: 'Townhouses', mixed: 'Mixed' };

  for (const row of rows) {
    const projectName = String(row[header[colIdx.projectName]] || '').trim();
    const project = findProject(projectName);

    if (!project) {
      skippedCount++;
      skippedReasons.noProject++;
      continue;
    }

    const city = colIdx.city !== -1 ? String(row[header[colIdx.city]] || '').trim().toLowerCase() : '';
    if (city && city !== project.location.trim().toLowerCase()) {
      skippedCount++;
      skippedReasons.noCityMatch++;
      continue;
    }

    const propertyType = colIdx.propertyType !== -1 ? String(row[header[colIdx.propertyType]] || '').trim().toLowerCase() : '';
    if (propertyType) {
      const mapped = typeMap[propertyType] || propertyType;
      const projectType = project.type.toLowerCase();
      const mappedLower = mapped.toLowerCase();
      if (mappedLower !== projectType && !projectType.includes(mappedLower) && !mappedLower.includes(projectType)) {
        skippedCount++;
        skippedReasons.noPropertyTypeMatch++;
        continue;
      }
    }

    const unitNumber = colIdx.number !== -1
      ? String(row[header[colIdx.number]] || '').trim()
      : '';
    const typeLabel = colIdx.type !== -1
      ? String(row[header[colIdx.type]] || '').trim()
      : '';
    const subtypeLabel = colIdx.subtype !== -1
      ? String(row[header[colIdx.subtype]] || '').trim()
      : '';
    const floor = colIdx.floor !== -1
      ? String(row[header[colIdx.floor]] || '').trim()
      : '';

    const internal = colIdx.internal !== -1 ? parseFloat(row[header[colIdx.internal]]) || 0 : 0;
    const external = colIdx.external !== -1 ? parseFloat(row[header[colIdx.external]]) || 0 : 0;
    const total = colIdx.total !== -1 ? parseFloat(row[header[colIdx.total]]) || 0 : 0;
    const price = colIdx.price !== -1 ? parseFloat(row[header[colIdx.price]]) || 0 : 0;

    if (!unitNumber) {
      skippedCount++;
      skippedReasons.noUnitNumber++;
      continue;
    }

    const unitTypes = unitTypeCache[project.id] || [];

    let unitTypeId = null;

    if (typeLabel) {
      const typeLower = typeLabel.toLowerCase();

      for (const ut of unitTypes) {
        const labelLower = ut.label.toLowerCase();
        if (labelLower === typeLower || labelLower.includes(typeLower) || typeLower.includes(labelLower)) {
          unitTypeId = ut.id;
          break;
        }
      }
    }

    if (!unitTypeId) {
      skippedCount++;
      skippedReasons.noUnitType++;
      continue;
    }

    await prisma.unit.create({
      data: {
        projectId: project.id,
        unitTypeId,
        number: unitNumber,
        floor,
        areaInternal: internal,
        areaExternal: external,
        area: total,
        price,
        ...(subtypeLabel && { subtype: subtypeLabel }),
      },
    });

    importedCount++;
  }

  logger.info(`[Availability] Import complete: imported=${importedCount}, skipped=${skippedCount}, reasons=${JSON.stringify(skippedReasons)}`);

  const grouped = await groupByProject();

  return {
    projects: grouped,
    summary: { totalImported: importedCount, totalSkipped: skippedCount },
  };
};

export const getProjectsWithUnits = async () => {
  const projectsWithUnits = await prisma.project.findMany({
    where: {
      units: {
        some: { deletedAt: null },
      },
    },
    select: {
      id: true,
      name: true,
      location: true,
      type: true,
      completionDate: true,
      primaryColor: true,
      secondaryColor: true,
      _count: {
        select: { units: { where: { deletedAt: null } } },
      },
    },
    orderBy: { name: 'asc' },
  });

  return projectsWithUnits.map((p) => ({
    id: p.id,
    name: p.name,
    location: p.location,
    type: p.type,
    completionDate: p.completionDate,
    primaryColor: p.primaryColor,
    secondaryColor: p.secondaryColor,
    unitCount: p._count.units,
  }));
};

export const getProjectUnits = async (projectId, { search, unitType } = {}) => {
  const where = { projectId, deletedAt: null };

  if (search && search.trim()) {
    where.number = { contains: search.trim(), mode: 'insensitive' };
  }

  const units = await prisma.unit.findMany({
    where,
    include: { project: { select: { id: true, name: true } }, unitType: { select: { id: true, label: true } } },
    orderBy: [{ floor: 'asc' }, { number: 'asc' }],
  });

  let filtered = units;

  if (unitType) {
    const typeLower = unitType.trim().toLowerCase();
    filtered = units.filter((u) => u.unitType.label.toLowerCase() === typeLower);
  }

  if (filtered.length === 0 && !search && !unitType) return null;

  const projectName = filtered.length > 0 ? filtered[0].project.name : units[0]?.project.name || '';
  const distinctTypes = [...new Set(units.map((u) => u.unitType.label))].sort();

  return {
    projectId,
    projectName,
    unitCount: filtered.length,
    unitTypes: distinctTypes,
    units: filtered.map((u) => ({
      id: u.id,
      number: u.number,
      typeId: u.unitType.id,
      type: u.unitType.label,
      subtype: u.subtype,
      floor: u.floor,
      internal: u.areaInternal,
      external: u.areaExternal,
      total: u.area,
      price: u.price,
      isGhost: u.isGhost,
      createdBy: u.createdBy,
    })),
  };
};

export const getUnitPaymentPlans = async (projectId, unitId) => {
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, projectId, deletedAt: null },
    include: { project: { select: { name: true } }, unitType: { select: { label: true, paymentPlans: true } } },
  });

  if (!unit) return null;

  return {
    unitId: unit.id,
    unitNumber: unit.number,
    unitType: unit.unitType.label,
    projectName: unit.project.name,
    paymentPlans: (unit.unitType.paymentPlans || [])
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map((pp) => ({
        id: pp.id,
        unitTypeId: pp.unitTypeId,
        unitTypeLabel: unit.unitType.label,
        planType: pp.planType,
        label: pp.label,
        dp: pp.dp,
        installmentPct: pp.installmentPct,
        onHandover: calcOnHandover(pp.dp, pp.installmentPct, pp.durationType, pp.durationMonths),
        durationType: pp.durationType,
        durationMonths: pp.durationMonths,
        discount: pp.discount,
        eventName: pp.eventName,
        eventDiscount: pp.eventDiscount,
        eventInstallmentPct: pp.eventInstallmentPct,
        eventDurationType: pp.eventDurationType,
        eventDurationMonths: pp.eventDurationMonths,
        sortOrder: pp.sortOrder,
      })),
  };
};

const calcOnHandover = (dp, installmentPct, durationType, durationMonths) => {
  if (installmentPct === 0) return +(100 - dp).toFixed(1);
  if (durationType === 'fixed_months') return +Math.max(0, Math.round((100 - dp - installmentPct * durationMonths) * 10) / 10).toFixed(1);
  return 0;
};

export const deleteAll = async () => {
  const result = await prisma.unit.deleteMany({});
  logger.info(`All availability units cleared: ${result.count} deleted`);
  return result;
};

const groupByProject = async (projectId) => {
  const where = { deletedAt: null };
  if (projectId) where.projectId = projectId;

  const units = await prisma.unit.findMany({
    where,
    include: { project: { select: { id: true, name: true } }, unitType: { select: { id: true, label: true } } },
    orderBy: [{ projectId: 'asc' }, { floor: 'asc' }, { number: 'asc' }],
  });

  const projectGroups = {};
  for (const unit of units) {
    const pid = unit.projectId;
    if (!projectGroups[pid]) {
      projectGroups[pid] = {
        projectId: pid,
        projectName: unit.project.name,
        unitCount: 0,
        units: [],
      };
    }
    projectGroups[pid].units.push({
      id: unit.id,
      number: unit.number,
      typeId: unit.unitType.id,
      type: unit.unitType.label,
      subtype: unit.subtype,
      floor: unit.floor,
      internal: unit.areaInternal,
      external: unit.areaExternal,
      total: unit.area,
      price: unit.price,
      isGhost: unit.isGhost,
      createdBy: unit.createdBy,
    });
    projectGroups[pid].unitCount++;
  }

  return Object.values(projectGroups);
};
