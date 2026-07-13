import crypto from 'crypto';

const generateOtp = () => {
  const num = crypto.randomInt(0, 1000000);
  return String(num).padStart(6, '0');
};

export default generateOtp;
