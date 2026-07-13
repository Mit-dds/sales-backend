import fs from 'fs';
import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates', 'pdf');

let browserInstance = null;
let browserUsed = false;

async function getBrowser() {
  if (!browserInstance || (typeof browserInstance.isConnected === 'function' ? !browserInstance.isConnected() : !browserInstance.connected)) {
    const useCloudChromium = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);

    if (useCloudChromium && process.platform === 'linux') {
      const executablePath = await chromium.executablePath();

      if (fs.existsSync(executablePath)) {
        browserInstance = await puppeteer.launch({
          headless: true,
          args: chromium.args,
          executablePath,
        });
      } else {
        browserInstance = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });
      }
    } else {
      browserInstance = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
    }

    browserUsed = false;
  }
  browserUsed = true;
  return browserInstance;
}

export async function closeBrowser() {
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch {
    }
    browserInstance = null;
    browserUsed = false;
  }
}

function fmtAED(n) {
  if (n === 0) return 'AED 0';
  return 'AED ' + Math.round(n).toLocaleString('en-US');
}

function fmtUSD(n, rate) {
  return 'USD ' + Math.round(n * (rate || 1 / 3.65)).toLocaleString('en-US');
}

function fmtDate(d) {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function hexRgb(hex) {
  const c = hex.replace('#', '');
  return `${parseInt(c.substring(0, 2), 16)},${parseInt(c.substring(2, 4), 16)},${parseInt(c.substring(4, 6), 16)}`;
}

function getHandoverMonths(completionDate) {
  if (!completionDate) return 18;
  const now = new Date();
  const handover = new Date(completionDate);
  return Math.max(1, (handover.getFullYear() - now.getFullYear()) * 12 + handover.getMonth() - now.getMonth());
}

const HELPERS = { fmtAED, fmtUSD, fmtDate, hexRgb, getHandoverMonths };

export async function renderTemplate(templateName, data) {
  const templatePath = path.join(TEMPLATES_DIR, `${templateName}.ejs`);
  return ejs.renderFile(templatePath, { ...data, ...HELPERS });
}

export async function generatePdf(htmlContent, options = {}) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: options.format || 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
    displayHeaderFooter: false,
    ...options,
  });

  await page.close();
  return Buffer.from(pdfBuffer);
}
