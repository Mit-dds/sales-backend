import ApiError from '../utils/apiError.js';

const VALID_DURATION_TYPES = ['till_handover', 'fixed_months'];
const VALID_PLAN_TYPES = ['normal', 'event', 'both'];

export const validateCreateUnitType = (body) => {
  const { label, subtypes, virtualTour, unitTypeId } = body || {};

  if (!label || !label.trim()) {
    throw new ApiError(400, 'Unit type label is required');
  }
  if (!Array.isArray(subtypes) || subtypes.length === 0) {
    throw new ApiError(400, 'At least one subtype is required');
  }

  const validatedSubtypes = subtypes.map((item, i) => {
    if (typeof item === 'string') {
      if (!item.trim()) {
        throw new ApiError(400, `Subtype at index ${i} cannot be empty`);
      }
      return { label: item.trim() };
    }
    if (typeof item === 'object' && item !== null) {
      if (!item.label || !item.label.trim()) {
        throw new ApiError(400, `Subtype at index ${i} requires a label`);
      }
      return {
        id: item.id || null,
        label: item.label.trim(),
        floorPlan: item.floorPlan || undefined,
        clearFloorPlan: item.clearFloorPlan === true || item.clearFloorPlan === 'true',
      };
    }
    throw new ApiError(400, `Invalid subtype at index ${i}`);
  });

  return {
    unitTypeId: unitTypeId || null,
    label: label.trim(),
    subtypes: validatedSubtypes,
    virtualTour: virtualTour && virtualTour.trim() ? virtualTour.trim() : null,
  };
};

export const validateUpdateUnitType = (body) => {
  const { label, virtualTour } = body || {};

  if (!label && virtualTour === undefined) {
    throw new ApiError(400, 'At least one field (label, virtualTour) must be provided');
  }

  const result = {};
  if (label !== undefined) {
    if (!label || !label.trim()) {
      throw new ApiError(400, 'Unit type label cannot be empty');
    }
    result.label = label.trim();
  }
  if (virtualTour !== undefined) {
    result.virtualTour = virtualTour && virtualTour.trim() ? virtualTour.trim() : null;
  }

  return result;
};

export const validateBatchUpdateSubTypes = (body) => {
  const { subtypes } = body || {};

  if (!Array.isArray(subtypes) || subtypes.length === 0) {
    throw new ApiError(400, 'At least one subtype is required');
  }

  const validated = subtypes.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new ApiError(400, `Subtype at index ${index}: must be an object`);
    }
    if (!item.label || !item.label.trim()) {
      throw new ApiError(400, `Subtype at index ${index}: label is required`);
    }
    if (item.id !== undefined && typeof item.id !== 'string') {
      throw new ApiError(400, `Subtype at index ${index}: id must be a string`);
    }

    return {
      id: item.id || null,
      label: item.label.trim(),
      floorPlan: item.floorPlan || undefined,
      clearFloorPlan: item.clearFloorPlan === true || item.clearFloorPlan === 'true',
    };
  });

  return { subtypes: validated };
};

export const validatePaymentPlans = (body) => {
  const { plans } = body || {};

  if (!Array.isArray(plans) || plans.length === 0) {
    throw new ApiError(400, 'At least one payment plan is required');
  }

  const validated = plans.map((plan, index) => {
    if (!plan.label || !plan.label.trim()) {
      throw new ApiError(400, `Payment plan at index ${index}: label is required`);
    }
    if (plan.dp === undefined || plan.dp === null || typeof plan.dp !== 'number') {
      throw new ApiError(400, `Payment plan at index ${index}: dp (down payment %) is required and must be a number`);
    }
    if (plan.dp < 0 || plan.dp > 100) {
      throw new ApiError(400, `Payment plan at index ${index}: dp must be between 0 and 100`);
    }
    if (plan.durationType && !VALID_DURATION_TYPES.includes(plan.durationType)) {
      throw new ApiError(400, `Payment plan at index ${index}: durationType must be one of: ${VALID_DURATION_TYPES.join(', ')}`);
    }
    if (plan.durationType === 'fixed_months' && (!plan.durationMonths || plan.durationMonths < 1)) {
      throw new ApiError(400, `Payment plan at index ${index}: durationMonths is required when durationType is fixed_months`);
    }
    if (plan.planType && !VALID_PLAN_TYPES.includes(plan.planType)) {
      throw new ApiError(400, `Payment plan at index ${index}: planType must be one of: ${VALID_PLAN_TYPES.join(', ')}`);
    }

    return {
      label: plan.label.trim(),
      dp: plan.dp,
      installmentPct: plan.installmentPct || 0,
      durationType: plan.durationType || 'till_handover',
      durationMonths: plan.durationType === 'fixed_months' ? (plan.durationMonths || 0) : null,
      discount: plan.discount || 0,
      planType: plan.planType || 'normal',
      eventName: plan.eventName || null,
      eventDiscount: plan.eventDiscount != null ? plan.eventDiscount : null,
      eventInstallmentPct: plan.eventInstallmentPct != null ? plan.eventInstallmentPct : null,
      eventDurationType: plan.eventDurationType || 'till_handover',
      eventDurationMonths: plan.eventDurationMonths != null ? plan.eventDurationMonths : null,
    };
  });

  return { plans: validated };
};

const VALID_DURATION_TYPES_INDIVIDUAL = ['till_handover', 'fixed_months'];
const VALID_PLAN_TYPES_INDIVIDUAL = ['normal', 'event', 'both'];

export const validatePaymentPlanInput = (body) => {
  const { label, dp, installmentPct, durationType, durationMonths, discount, planType, eventName, eventDiscount, eventInstallmentPct, eventDurationType, eventDurationMonths } = body || {};

  if (!label || !label.trim()) {
    throw new ApiError(400, 'Payment plan label is required');
  }
  if (dp === undefined || dp === null || typeof dp !== 'number') {
    throw new ApiError(400, 'dp (down payment %) is required and must be a number');
  }
  if (dp < 0 || dp > 100) {
    throw new ApiError(400, 'dp must be between 0 and 100');
  }
  if (durationType && !VALID_DURATION_TYPES_INDIVIDUAL.includes(durationType)) {
    throw new ApiError(400, `durationType must be one of: ${VALID_DURATION_TYPES_INDIVIDUAL.join(', ')}`);
  }
  if (durationType === 'fixed_months' && (!durationMonths || durationMonths < 1)) {
    throw new ApiError(400, 'durationMonths is required when durationType is fixed_months');
  }
  if (planType && !VALID_PLAN_TYPES_INDIVIDUAL.includes(planType)) {
    throw new ApiError(400, `planType must be one of: ${VALID_PLAN_TYPES_INDIVIDUAL.join(', ')}`);
  }

  return {
    label: label.trim(),
    dp,
    installmentPct: installmentPct || 0,
    durationType: durationType || 'till_handover',
    durationMonths: durationType === 'fixed_months' ? (durationMonths || 0) : null,
    discount: discount || 0,
    planType: planType || 'normal',
    eventName: eventName || null,
    eventDiscount: eventDiscount != null ? eventDiscount : null,
    eventInstallmentPct: eventInstallmentPct != null ? eventInstallmentPct : null,
    eventDurationType: eventDurationType || 'till_handover',
    eventDurationMonths: eventDurationMonths != null ? eventDurationMonths : null,
  };
};
