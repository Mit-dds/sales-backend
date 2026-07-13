import ApiError from '../utils/apiError.js';

const VALID_PROJECT_TYPES = ['Apartments', 'Townhouses', 'Mixed'];
const VALID_PROJECT_STATUSES = ['Off-plan', 'Ready'];
const DB_PROJECT_STATUSES = { 'Off-plan': 'OffPlan', 'Ready': 'Ready' };

export const validateEnum = (value, validValues, fieldName) => {
  if (!validValues.includes(value)) {
    throw new ApiError(400, `Invalid ${fieldName}. Must be one of: ${validValues.join(', ')}`);
  }
  return value;
};

export const validateWhyBuyItems = (body) => {
  const { items } = body || {};

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'items is required and must be a non-empty array of strings');
  }

  const trimmed = items.map((item, i) => {
    if (typeof item !== 'string' || !item.trim()) {
      throw new ApiError(400, `items[${i}] must be a non-empty string`);
    }
    const t = item.trim();
    if (t.length > 500) {
      throw new ApiError(400, `items[${i}] must not exceed 500 characters`);
    }
    return t;
  });

  return trimmed;
};

export const validateProjectInput = (body) => {
  const {
    name, location, type, status, completionDate,
    feeLabel, feePct, feeFixed, utilityAmount, parkingCost,
    bookingToken, primaryColor, secondaryColor,
    dpSplitOptions, disclaimer,
  } = body;

  if (!name || !name.trim()) throw new ApiError(400, 'Project name is required');
  if (!location || !location.trim()) throw new ApiError(400, 'Location is required');
  if (!type) throw new ApiError(400, 'Project type is required');
  if (!status) throw new ApiError(400, 'Project status is required');

  validateEnum(type, VALID_PROJECT_TYPES, 'project type');
  validateEnum(status, VALID_PROJECT_STATUSES, 'project status');

  if (feePct !== undefined && (typeof feePct !== 'number' || feePct < 0)) {
    throw new ApiError(400, 'Fee percentage must be a non-negative number');
  }
  if (feeFixed !== undefined && (typeof feeFixed !== 'number' || feeFixed < 0)) {
    throw new ApiError(400, 'Fee fixed must be a non-negative number');
  }
  if (dpSplitOptions !== undefined) {
    if (!Array.isArray(dpSplitOptions) || dpSplitOptions.some((v) => typeof v !== 'number')) {
      throw new ApiError(400, 'dpSplitOptions must be an array of numbers');
    }
  }

  return {
    name: name.trim(),
    location: location.trim(),
    type,
    status: DB_PROJECT_STATUSES[status],
    completionDate: completionDate || '',
    feeLabel: feeLabel || '',
    feePct: feePct || 0,
    feeFixed: feeFixed || 0,
    utilityAmount: utilityAmount || 0,
    parkingCost: parkingCost || 0,
    bookingToken: bookingToken || 20000,
    primaryColor: primaryColor || '#1A3C6B',
    secondaryColor: secondaryColor || '#A8C5E8',
    dpSplitOptions: dpSplitOptions || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    disclaimer: disclaimer || '',
  };
};

export const validateProjectUpdateInput = (body) => {
  const data = {};

  if (body.name !== undefined) {
    if (!body.name || !body.name.trim()) throw new ApiError(400, 'Project name cannot be empty');
    data.name = body.name.trim();
  }
  if (body.location !== undefined) {
    if (!body.location || !body.location.trim()) throw new ApiError(400, 'Location cannot be empty');
    data.location = body.location.trim();
  }
  if (body.type !== undefined) {
    validateEnum(body.type, VALID_PROJECT_TYPES, 'project type');
    data.type = body.type;
  }
  if (body.status !== undefined) {
    validateEnum(body.status, VALID_PROJECT_STATUSES, 'project status');
    data.status = DB_PROJECT_STATUSES[body.status];
  }
  if (body.completionDate !== undefined) data.completionDate = body.completionDate || '';
  if (body.feeLabel !== undefined) data.feeLabel = body.feeLabel || '';
  if (body.feePct !== undefined) {
    if (typeof body.feePct !== 'number' || body.feePct < 0) throw new ApiError(400, 'Fee percentage must be a non-negative number');
    data.feePct = body.feePct;
  }
  if (body.feeFixed !== undefined) {
    if (typeof body.feeFixed !== 'number' || body.feeFixed < 0) throw new ApiError(400, 'Fee fixed must be a non-negative number');
    data.feeFixed = body.feeFixed;
  }
  if (body.utilityAmount !== undefined) data.utilityAmount = body.utilityAmount;
  if (body.parkingCost !== undefined) data.parkingCost = body.parkingCost;
  if (body.bookingToken !== undefined) data.bookingToken = body.bookingToken;
  if (body.primaryColor !== undefined) data.primaryColor = body.primaryColor;
  if (body.secondaryColor !== undefined) data.secondaryColor = body.secondaryColor;
  if (body.dpSplitOptions !== undefined) {
    if (!Array.isArray(body.dpSplitOptions) || body.dpSplitOptions.some((v) => typeof v !== 'number')) {
      throw new ApiError(400, 'dpSplitOptions must be an array of numbers');
    }
    data.dpSplitOptions = body.dpSplitOptions;
  }
  if (body.disclaimer !== undefined) data.disclaimer = body.disclaimer || '';

  return data;
};
