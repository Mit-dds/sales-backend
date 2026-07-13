import prisma from '../config/db.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/apiError.js';
import * as authService from '../services/auth.service.js';
import {
  validateStatusQuery,
  validateStatusBody,
  validatePagination,
  validateIncludeRemoved,
} from '../validators/admin.validator.js';

const excludePassword = (user) => {
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

export const getUsers = asyncHandler(async (req, res) => {
  const { page, limit } = validatePagination(req.query.page, req.query.limit);
  const statusFilter = validateStatusQuery(req.query.status);
  const includeRemoved = validateIncludeRemoved(req.query.includeRemoved);
  const search = req.query.search ? req.query.search.trim() : '';

  const where = {};
  if (statusFilter) {
    where.status = statusFilter;
  } else if (!includeRemoved) {
    where.status = { not: 'REMOVED' };
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      users: users.map(excludePassword),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.userId } });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.json({
    success: true,
    data: { user: excludePassword(user) },
  });
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const newStatus = validateStatusBody(req.body.status);

  if (userId === req.user.id && newStatus !== 'ACTIVE') {
    throw new ApiError(400, 'You cannot deactivate or remove your own account');
  }

  const user = await authService.updateUserStatus(userId, newStatus);

  res.json({
    success: true,
    message: `User status updated to ${newStatus}`,
    data: { user },
  });
});
