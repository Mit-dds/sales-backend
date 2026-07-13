import ApiError from '../utils/apiError.js';

const VALID_STATUSES = ['PENDING', 'ACTIVE', 'INACTIVE', 'REMOVED'];

export const validateStatusQuery = (status) => {
  if (!status) return undefined;
  const upper = status.toUpperCase();
  if (!VALID_STATUSES.includes(upper)) {
    throw new ApiError(400, `Invalid status filter. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  return upper;
};

export const validateStatusBody = (status) => {
  if (!status) {
    throw new ApiError(400, 'Status is required');
  }
  const upper = status.toUpperCase();
  if (!VALID_STATUSES.includes(upper)) {
    throw new ApiError(400, `Invalid status value. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  return upper;
};

export const validatePagination = (page, limit) => {
  const p = parseInt(page, 10) || 1;
  const l = parseInt(limit, 10) || 10;
  if (p < 1) throw new ApiError(400, 'Page must be at least 1');
  if (l < 1 || l > 100) throw new ApiError(400, 'Limit must be between 1 and 100');
  return { page: p, limit: l };
};

export const validateIncludeRemoved = (value) => {
  return value === 'true';
};
