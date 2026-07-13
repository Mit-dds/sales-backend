import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';

const isAdmin = asyncHandler(async (req, _res, next) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Access denied. Admin only');
  }

  next();
});

export default isAdmin;
