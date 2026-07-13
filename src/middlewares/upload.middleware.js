import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ApiError from '../utils/apiError.js';

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];
const MAX_SIZE = 10 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const { projectId } = req.params;
    const type = req.query.type || 'images';
    const dir = path.resolve(`uploads/projects/${projectId}/${type}`);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return cb(new ApiError(400, `Invalid file type: ${file.mimetype}. Allowed: JPEG, PNG, GIF, WebP, PDF`), false);
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } });

const excelStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.resolve('uploads/availability');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `availability-${uniqueSuffix}${ext}`);
  },
});

const excelFileFilter = (_req, file, cb) => {
  const excelTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];
  if (!excelTypes.includes(file.mimetype)) {
    return cb(new ApiError(400, 'Invalid file type. Only .xlsx and .xls files are allowed'), false);
  }
  cb(null, true);
};

const uploadExcel = multer({ storage: excelStorage, fileFilter: excelFileFilter, limits: { fileSize: MAX_SIZE } });

const userStorage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const dir = path.resolve('uploads/users');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `user-${req.user.id}-${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const userProfileFilter = (_req, file, cb) => {
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!imageTypes.includes(file.mimetype)) {
    return cb(new ApiError(400, `Invalid file type: ${file.mimetype}. Allowed: JPEG, PNG, GIF, WebP`), false);
  }
  cb(null, true);
};

const uploadUserProfile = multer({
  storage: userStorage,
  fileFilter: userProfileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export { uploadExcel, uploadUserProfile };
export default upload;
