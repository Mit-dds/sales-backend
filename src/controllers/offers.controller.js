import * as offersService from '../services/offers.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/apiError.js';

export const createOffer = asyncHandler(async (req, res) => {
  const { clientName, projectName, unitNumber, planLabel, listPrice, netPrice } = req.body;
  if (!clientName || !projectName || !unitNumber || !planLabel || listPrice == null || netPrice == null) {
    throw new ApiError(400, 'Missing required fields: clientName, projectName, unitNumber, planLabel, listPrice, netPrice');
  }
  const offer = await offersService.createOffer(req.body, req.user);
  res.status(201).json({ success: true, data: offer });
});

export const listOffers = asyncHandler(async (req, res) => {
  const { page, limit, search, projectId, offerMode, agentName, sortBy, sortDir } = req.query;
  const result = await offersService.getAllOffers({
    agentId: req.user.id,
    isAdmin: req.user.role === 'admin',
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 20,
    search,
    projectId,
    offerMode,
    agentName,
    sortBy,
    sortDir,
  });
  res.json({ success: true, data: result });
});
