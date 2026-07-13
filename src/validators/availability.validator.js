import ApiError from '../utils/apiError.js';

export const validateImportFile = (file) => {
  if (!file) throw new ApiError(400, 'File is required. Upload an XLSX or XLS file');

  const allowed = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];

  if (!allowed.includes(file.mimetype)) {
    throw new ApiError(400, 'Invalid file type. Must be .xlsx or .xls');
  }

  return file;
};

export const validateUnitId = (unitId) => {
  if (!unitId || typeof unitId !== 'string' || !unitId.trim()) {
    throw new ApiError(400, 'Unit ID is required');
  }
  return unitId.trim();
};
