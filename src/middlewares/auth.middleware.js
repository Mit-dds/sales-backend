import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import prisma from '../config/db.js';

const authMiddleware = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Access denied. No token provided');
  }

  const token = authHeader.split(' ')[1];

  let payload;
  try {
    payload = jwt.verify(token, config.accessToken.secret);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired access token');
  }

  if (payload.type !== 'access') {
    throw new ApiError(401, 'Invalid token type');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });

  if (!user) {
    throw new ApiError(401, 'User not found');
  }

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    profileEmail: user.profileEmail,
    role: user.role,
    status: user.status,
    photo: user.photo,
    watermark: user.watermark,
  };

  next();
});

export default authMiddleware;
