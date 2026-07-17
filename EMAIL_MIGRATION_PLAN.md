# EmailJS to Resend Migration Plan

## Executive Summary

This document outlines the migration from EmailJS to Resend for email sending functionality in the Reportage Properties platform. Resend provides a modern, developer-friendly email API with better deliverability, simpler integration, and more flexible template management.

---

## Current State Analysis

### EmailJS Implementation

**Location:** `backend/src/utils/emailjs.service.js`

**Current Functions:**
1. `sendOtpEmail(user, otpCode)` - Sends OTP verification emails
2. `sendAdminNotificationEmail(adminEmail, user)` - Notifies admins of new registrations
3. `sendApprovalEmail(user)` - Sends approval/welcome emails to agents

**Configuration:**
- Service ID: `EMAILJS_SERVICE_ID`
- Public Key: `EMAILJS_PUBLIC_KEY`
- Private Key: `EMAILJS_PRIVATE_KEY`
- OTP Template: `EMAILJS_OTP_TEMPLATE_ID` (default: `template_i9ox8d8`)
- Notification Template: `EMAILJS_NOTIFICATION_TEMPLATE_ID` (default: `template_0wnup9f`)

**Usage Locations:**
- `backend/src/services/auth.service.js` - Line 6: imports email functions
- All test files mock `../utils/emailjs.service.js`

---

## Resend API Overview

### Why Resend?

1. **Better Deliverability** - Built on Amazon SES infrastructure
2. **Simpler API** - REST-based with clean SDK
3. **Template Management** - Server-side templates with dynamic variables
4. **Free Tier** - 100 emails/day, 3,000/month
5. **Modern DX** - TypeScript support, excellent documentation
6. **Email Validation** - Built-in email verification
7. **Analytics** - Open tracking, click tracking

### API Structure

```javascript
// Resend API endpoint
POST https://api.resend.com/emails

// Authentication
Authorization: Bearer re_xxxxxxxxxxxxxxxx

// Request body
{
  "from": "noreply@yourdomain.com",
  "to": ["user@example.com"],
  "subject": "Your OTP Code",
  "html": "<h1>Your OTP: {{otp_code}}</h1>",
  "reply_to": "support@yourdomain.com"
}
```

---

## Migration Plan

### Phase 1: Setup & Configuration

**Duration:** 1-2 hours

**Tasks:**
1. Create Resend account and get API key
2. Verify domain in Resend dashboard
3. Set up environment variables
4. Install Resend SDK

**Deliverables:**
- Resend account configured
- Domain verified
- API key generated
- Environment variables updated

### Phase 2: Email Templates

**Duration:** 2-3 hours

**Tasks:**
1. Create email templates in Resend dashboard
2. Map EmailJS template variables to Resend variables
3. Design responsive HTML templates
4. Test template rendering

**Template Mapping:**

| EmailJS Template | Resend Template | Variables |
|------------------|-----------------|-----------|
| OTP Email | `otp-email` | `to_name`, `otp_code`, `expiry_minutes`, `app_name` |
| Admin Notification | `admin-notification` | `to_name`, `company_name`, `company_email`, `website_link`, `user_info_html` |
| Agent Welcome | `agent-welcome` | `to_name`, `company_name`, `company_email`, `website_link` |

### Phase 3: Backend Integration

**Duration:** 2-3 hours

**Tasks:**
1. Create new `resend.service.js` file
2. Implement email sending functions
3. Update config to use Resend variables
4. Update auth.service.js imports
5. Remove EmailJS dependencies

**File Changes:**

**Create:** `backend/src/utils/resend.service.js`
```javascript
import { Resend } from 'resend';
import config from '../config/index.js';
import logger from './logger.js';

const resend = new Resend(config.resend.apiKey);

export const sendOtpEmail = async (user, otpCode) => {
  try {
    await resend.emails.send({
      from: config.resend.fromEmail,
      to: user.email,
      subject: `${config.companyName} - Your OTP Code`,
      html: `<h1>Hello ${user.name}</h1><p>Your OTP code is: <strong>${otpCode}</strong></p><p>This code expires in 10 minutes.</p>`,
    });
  } catch (err) {
    logger.error(`sendOtpEmail failed: ${err.message}`);
  }
};

// Similar functions for other email types...
```

**Update:** `backend/src/config/index.js`
```javascript
resend: {
  apiKey: process.env.RESEND_API_KEY || '',
  fromEmail: process.env.RESEND_FROM_EMAIL || 'noreply@reportage.com',
},
```

**Update:** `backend/src/services/auth.service.js`
```javascript
// Change from:
import { sendOtpEmail, sendAdminNotificationEmail, sendApprovalEmail } from '../utils/emailjs.service.js';

// To:
import { sendOtpEmail, sendAdminNotificationEmail, sendApprovalEmail } from '../utils/resend.service.js';
```

### Phase 4: Testing

**Duration:** 2-3 hours

**Tasks:**
1. Update test mocks for Resend
2. Test email sending functionality
3. Verify template rendering
4. Test error handling
5. Validate email deliverability

**Test Updates:**

**Update:** All test files that mock emailjs
```javascript
// Change from:
vi.mock('../utils/emailjs.service.js', () => ({
  sendOtpEmail: vi.fn(),
  sendAdminNotificationEmail: vi.fn(),
  sendApprovalEmail: vi.fn(),
}));

// To:
vi.mock('../utils/resend.service.js', () => ({
  sendOtpEmail: vi.fn(),
  sendAdminNotificationEmail: vi.fn(),
  sendApprovalEmail: vi.fn(),
}));
```

### Phase 5: Deployment

**Duration:** 1 hour

**Tasks:**
1. Update `.env.example` with Resend variables
2. Update production environment variables
3. Deploy backend changes
4. Verify email functionality in production
5. Monitor delivery rates

**Environment Variables:**

**Add to `.env.example`:**
```bash
# Resend Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@reportage.com

# Remove EmailJS Configuration
# EMAILJS_SERVICE_ID=
# EMAILJS_PUBLIC_KEY=
# EMAILJS_PRIVATE_KEY=
# EMAILJS_OTP_TEMPLATE_ID=
# EMAILJS_NOTIFICATION_TEMPLATE_ID=
```

---

## Implementation Details

### New Service File Structure

**File:** `backend/src/utils/resend.service.js`

```javascript
import { Resend } from 'resend';
import config from '../config/index.js';
import logger from './logger.js';

const resend = new Resend(config.resend.apiKey);

const formatDate = (date) => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const sendOtpEmail = async (user, otpCode) => {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333;">Hello ${user.name},</h1>
        <p>Your OTP verification code is:</p>
        <div style="background: #f5f5f5; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
          <span style="font-size: 24px; font-weight: bold; color: #007bff;">${otpCode}</span>
        </div>
        <p style="color: #666;">This code expires in <strong>10 minutes</strong>.</p>
        <p style="color: #999; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
      </body>
      </html>
    `;

    await resend.emails.send({
      from: config.resend.fromEmail,
      to: user.email,
      subject: `${config.companyName} - Your Verification Code`,
      html,
    });

    logger.debug(`OTP email sent to ${user.email}`);
  } catch (err) {
    logger.error(`sendOtpEmail failed: ${err.message}`);
  }
};

export const sendAdminNotificationEmail = async (adminEmail, user) => {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333;">New User Registration</h1>
        <p>A new user has registered on ${config.companyName}:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Name:</strong> ${user.name}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Phone:</strong> ${user.phone || 'Not provided'}</p>
          <p><strong>Registered:</strong> ${formatDate(user.createdAt)}</p>
        </div>
        <p>
          <a href="${config.adminPanelUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Review in Admin Panel
          </a>
        </p>
      </body>
      </html>
    `;

    await resend.emails.send({
      from: config.resend.fromEmail,
      to: adminEmail,
      subject: `${config.companyName} - New User Registration`,
      html,
    });

    logger.debug(`Admin notification sent to ${adminEmail}`);
  } catch (err) {
    logger.error(`sendAdminNotificationEmail failed: ${err.message}`);
  }
};

export const sendApprovalEmail = async (user) => {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333;">Welcome to ${config.companyName}!</h1>
        <p>Hello ${user.name},</p>
        <p>Your account has been approved. You can now log in to the platform.</p>
        <p>
          <a href="${config.frontendLoginUrl}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Log In Now
          </a>
        </p>
        <p style="color: #666;">If you have any questions, please contact us at ${config.companySupportEmail}.</p>
      </body>
      </html>
    `;

    await resend.emails.send({
      from: config.resend.fromEmail,
      to: user.email,
      subject: `${config.companyName} - Account Approved`,
      html,
    });

    logger.debug(`Approval email sent to ${user.email}`);
  } catch (err) {
    logger.error(`sendApprovalEmail failed: ${err.message}`);
  }
};
```

### Configuration Updates

**File:** `backend/src/config/index.js`

```javascript
// Add to config object
resend: {
  apiKey: process.env.RESEND_API_KEY || '',
  fromEmail: process.env.RESEND_FROM_EMAIL || 'noreply@reportage.com',
},

// Keep emailjs config temporarily for backward compatibility
// Remove after full migration is complete
```

---

## Testing Strategy

### Unit Tests

**Updated Mock Structure:**
```javascript
vi.mock('../utils/resend.service.js', () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
  sendAdminNotificationEmail: vi.fn().mockResolvedValue(undefined),
  sendApprovalEmail: vi.fn().mockResolvedValue(undefined),
}));
```

### Integration Tests

1. **Email Sending Test:**
   ```javascript
   describe('Resend Email Service', () => {
     it('should send OTP email successfully', async () => {
       const user = { email: 'test@example.com', name: 'Test User' };
       await sendOtpEmail(user, '123456');
       expect(resend.emails.send).toHaveBeenCalled();
     });
   });
   ```

2. **Template Rendering Test:**
   - Verify HTML templates render correctly
   - Check variable interpolation
   - Test responsive design

### End-to-End Tests

1. **Registration Flow:**
   - Register new user → Receive OTP email
   - Verify OTP → Admin notification sent
   - Admin approves → Approval email sent

2. **Email Deliverability:**
   - Test with real email addresses
   - Verify emails arrive in inbox (not spam)
   - Check email content renders correctly

---

## Risk Assessment

### High Risk
- **Email Deliverability:** New domain may have reputation issues
  - *Mitigation:* Warm up domain gradually, start with internal testing

### Medium Risk
- **Template Compatibility:** Existing EmailJS templates may not work directly
  - *Mitigation:* Rewrite templates for Resend's HTML support

### Low Risk
- **API Downtime:** Resend service unavailability
  - *Mitigation:* Resend has 99.9% uptime SLA

---

## Rollback Plan

If issues arise during migration:

1. **Immediate:** Revert to EmailJS configuration
2. **Steps:**
   - Restore `emailjs.service.js` file
   - Revert config changes
   - Update imports back to EmailJS
   - Restore original environment variables

3. **Data:** No data migration required (email templates are in service)

---

## Success Criteria

- [ ] All email types sending successfully via Resend
- [ ] Email deliverability rate > 95%
- [ ] No regression in existing functionality
- [ ] All tests passing with new implementation
- [ ] Production deployment successful
- [ ] Monitoring and alerting configured

---

## Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| 1. Setup | 1-2 hours | Resend account |
| 2. Templates | 2-3 hours | Phase 1 |
| 3. Integration | 2-3 hours | Phase 2 |
| 4. Testing | 2-3 hours | Phase 3 |
| 5. Deployment | 1 hour | Phase 4 |
| **Total** | **8-12 hours** | |

---

## Next Steps

1. Create Resend account at https://resend.com
2. Verify domain in Resend dashboard
3. Generate API key
4. Set up environment variables
5. Implement new email service
6. Test thoroughly
7. Deploy to production

---

## Appendix

### A. Resend API Reference

**Send Email:**
```javascript
POST https://api.resend.com/emails
Authorization: Bearer re_xxxxx
Content-Type: application/json

{
  "from": "onboarding@resend.dev",
  "to": ["user@example.com"],
  "subject": "Hello World",
  "html": "<h1>It works!</h1>"
}
```

**List Emails:**
```javascript
GET https://api.resend.com/emails
Authorization: Bearer re_xxxxx
```

**Get Email:**
```javascript
GET https://api.resend.com/emails/{email_id}
Authorization: Bearer re_xxxxx
```

### B. Environment Variables

```bash
# Resend Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@reportage.com

# Domain Verification
RESEND_DOMAIN=reportage.com
```

### C. Dependencies

**Package.json:**
```json
{
  "dependencies": {
    "resend": "^3.0.0"
  }
}
```

**Installation:**
```bash
npm install resend
```

---

*Document Version: 1.0*
*Last Updated: July 16, 2026*
*Author: Development Team*
