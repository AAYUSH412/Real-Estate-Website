// ═══════════════════════════════════════════════════════════
// BuildEstate Email Templates
// Design: Warm terracotta (#D4755B), clean & professional
// ═══════════════════════════════════════════════════════════

const BRAND = {
  color: '#D4755B',
  dark: '#221410',
  bg: '#FAF8F4',
  border: '#E6E0DA',
  text: '#374151',
  muted: '#6B7280',
  site: process.env.WEBSITE_URL || 'https://buildestate.vercel.app',
  year: new Date().getFullYear(),
};

// Shared wrapper — keeps every email consistent
const wrap = (title, body) => `
<div style="max-width:600px;margin:0 auto;font-family:'Helvetica Neue',Arial,sans-serif;color:${BRAND.text};line-height:1.7;background:${BRAND.bg};border-radius:12px;overflow:hidden;border:1px solid ${BRAND.border};">

  <!-- Header -->
  <div style="background:${BRAND.dark};padding:32px 28px;text-align:center;">
    <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">${title}</h1>
    <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.7);">BuildEstate</p>
  </div>

  <!-- Body -->
  <div style="padding:32px 28px;">
    ${body}
  </div>

  <!-- Footer -->
  <div style="border-top:1px solid ${BRAND.border};padding:20px 28px;text-align:center;font-size:12px;color:${BRAND.muted};">
    <p style="margin:0;">&copy; ${BRAND.year} BuildEstate. All rights reserved.</p>
    <p style="margin:8px 0 0;">
      <a href="${BRAND.site}" style="color:${BRAND.color};text-decoration:none;">Website</a>
      &nbsp;&middot;&nbsp;
      <a href="${BRAND.site}/contact" style="color:${BRAND.color};text-decoration:none;">Contact Us</a>
    </p>
  </div>
</div>`;

// Reusable detail row
const row = (label, value) =>
  `<tr><td style="padding:6px 0;color:${BRAND.muted};font-size:14px;width:110px;vertical-align:top;">${label}</td><td style="padding:6px 0;font-size:14px;color:${BRAND.dark};font-weight:500;">${value}</td></tr>`;

// Reusable CTA button
const btn = (href, text) =>
  `<div style="text-align:center;margin:28px 0;">
    <a href="${href}" style="display:inline-block;padding:14px 32px;background:${BRAND.color};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">${text}</a>
  </div>`;

// Status badge
const badge = (status) => {
  const colors = {
    confirmed: { bg: '#dcfce7', text: '#166534' },
    cancelled: { bg: '#fee2e2', text: '#991b1b' },
    pending:   { bg: '#fef3c7', text: '#854d0e' },
  };
  const c = colors[status] || colors.pending;
  return `<span style="display:inline-block;padding:3px 10px;border-radius:10px;font-size:13px;font-weight:600;background:${c.bg};color:${c.text};">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
};

// ─── 1. Scheduling Confirmation ──────────────────────────

export const getSchedulingEmailTemplate = (appointment, date, time, notes) => wrap(
  'Viewing Scheduled',
  `<p style="margin:0 0 20px;font-size:15px;">Your property viewing has been scheduled. Here are the details:</p>

  <div style="background:#ffffff;border:1px solid ${BRAND.border};border-radius:8px;padding:20px;margin-bottom:24px;">
    <table style="width:100%;border-collapse:collapse;">
      ${row('Property', appointment.propertyId.title)}
      ${row('Date', new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))}
      ${row('Time', time)}
      ${notes ? row('Notes', notes) : ''}
      ${row('Status', badge('pending'))}
    </table>
  </div>

  <p style="font-size:14px;color:${BRAND.muted};margin:0;">We will confirm your appointment shortly. If you have any questions, reply to this email.</p>`
);

// ─── 2. Appointment Status Update ────────────────────────

export const getEmailTemplate = (appointment, status) => wrap(
  `Appointment ${status.charAt(0).toUpperCase() + status.slice(1)}`,
  `<p style="margin:0 0 20px;font-size:15px;">Your appointment status has been updated.</p>

  <div style="background:#ffffff;border:1px solid ${BRAND.border};border-radius:8px;padding:20px;margin-bottom:24px;">
    <table style="width:100%;border-collapse:collapse;">
      ${row('Property', appointment.propertyId.title)}
      ${row('Date', new Date(appointment.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))}
      ${row('Time', appointment.time)}
      ${row('Status', badge(status))}
    </table>
  </div>

  ${status === 'confirmed'
    ? `<div style="background:#f0fdf4;border-left:3px solid #16a34a;padding:14px 16px;border-radius:6px;font-size:14px;color:#166534;margin-bottom:16px;">
        <strong>Next steps:</strong> Please arrive 10 minutes early and bring a valid ID.
      </div>`
    : status === 'cancelled'
    ? `<div style="background:#fef2f2;border-left:3px solid #dc2626;padding:14px 16px;border-radius:6px;font-size:14px;color:#991b1b;margin-bottom:16px;">
        This appointment has been cancelled. You can schedule another viewing at any time.
      </div>`
    : ''
  }

  ${btn(BRAND.site + '/properties', 'Browse Properties')}`
);

// ─── 3. Newsletter Subscription ──────────────────────────

export const getNewsletterTemplate = (email) => wrap(
  'Welcome to Our Newsletter',
  `<p style="margin:0 0 20px;font-size:15px;">Hello <strong style="color:${BRAND.color};">${email}</strong>,</p>
  <p style="margin:0 0 24px;font-size:15px;">Thank you for subscribing! You'll now receive updates on:</p>

  <div style="background:#ffffff;border:1px solid ${BRAND.border};border-radius:8px;padding:16px 20px;margin-bottom:24px;">
    <ul style="list-style:none;padding:0;margin:0;">
      <li style="padding:8px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;">Latest property listings</li>
      <li style="padding:8px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;">Real estate market trends</li>
      <li style="padding:8px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;">Exclusive deals &amp; investment tips</li>
      <li style="padding:8px 0;font-size:14px;">AI-powered property insights</li>
    </ul>
  </div>

  ${btn(BRAND.site + '/properties', 'Explore Properties')}`
);

// ─── 4. Welcome (Registration) ──────────────────────────

export const getWelcomeTemplate = (name) => wrap(
  'Welcome to BuildEstate',
  `<p style="margin:0 0 20px;font-size:15px;">Hello <strong style="color:${BRAND.color};">${name}</strong>,</p>
  <p style="margin:0 0 24px;font-size:15px;">Your account has been created successfully. Here's what you can do:</p>

  <div style="background:#ffffff;border:1px solid ${BRAND.border};border-radius:8px;padding:16px 20px;margin-bottom:24px;">
    <ul style="list-style:none;padding:0;margin:0;">
      <li style="padding:8px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;">Browse premium property listings</li>
      <li style="padding:8px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;">Schedule property viewings</li>
      <li style="padding:8px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;">Get AI-powered property recommendations</li>
      <li style="padding:8px 0;font-size:14px;">Save &amp; compare your favorite properties</li>
    </ul>
  </div>

  ${btn(BRAND.site + '/properties', 'Start Exploring')}

  <p style="font-size:13px;color:${BRAND.muted};margin:0;">Need help? Just reply to this email or visit our <a href="${BRAND.site}/contact" style="color:${BRAND.color};text-decoration:none;">contact page</a>.</p>`
);

// ─── 4.5. Email Verification ──────────────────────────────

export const getEmailVerificationTemplate = (name, verificationUrl) => wrap(
  'Verify Your Email Address',
  `<p style="margin:0 0 20px;font-size:15px;">Hello <strong style="color:${BRAND.color};">${name}</strong>,</p>
  <p style="margin:0 0 24px;font-size:15px;">Thanks for signing up with BuildEstate! To complete your registration and start exploring properties, please verify your email address.</p>

  <div style="background:#ffffff;border:1px solid ${BRAND.border};border-radius:8px;padding:20px;margin-bottom:24px;text-align:center;">
    <p style="margin:0 0 16px;font-size:14px;color:${BRAND.muted};">Click the button below to verify your email. This link expires in <strong>24 hours</strong>.</p>
  </div>

  ${btn(verificationUrl, 'Verify Email Address')}

  <div style="background:#fef3c7;border-left:3px solid #d97706;padding:14px 16px;border-radius:6px;font-size:13px;color:${BRAND.dark};margin:24px 0 16px;">
    <strong>Why verify?</strong> Email verification helps us keep your account secure and ensures you don't miss important property updates.
  </div>

  <div style="background:#f3f4f6;border-radius:8px;padding:14px 16px;margin:16px 0 0;">
    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:${BRAND.dark};">Button not working?</p>
    <p style="margin:0;font-size:12px;color:${BRAND.muted};word-break:break-all;">Copy and paste this link into your browser:<br/><a href="${verificationUrl}" style="color:${BRAND.color};text-decoration:none;">${verificationUrl}</a></p>
  </div>

  <p style="font-size:13px;color:${BRAND.muted};margin:16px 0 0;">If you didn't create an account with BuildEstate, you can safely ignore this email.</p>`
);

// ─── 5. Password Reset ──────────────────────────────────

export const getPasswordResetTemplate = (resetUrl) => wrap(
  'Reset Your Password',
  `<p style="margin:0 0 20px;font-size:15px;">We received a request to reset your BuildEstate account password.</p>

  <p style="margin:0 0 8px;font-size:14px;color:${BRAND.muted};">Click the button below to set a new password. This link expires in <strong>10 minutes</strong>.</p>

  ${btn(resetUrl, 'Reset Password')}

  <div style="background:#fef3c7;border-left:3px solid #d97706;padding:14px 16px;border-radius:6px;font-size:13px;color:#92400e;margin:24px 0 0;">
    <strong>Didn't request this?</strong> You can safely ignore this email — your password will remain unchanged.
  </div>`
);

// ─── 6. Listing Approved ────────────────────────────────

export const getListingApprovedTemplate = (propertyTitle, propertyId) => wrap(
  'Your Listing is Now Live!',
  `<p style="margin:0 0 20px;font-size:15px;">Great news — your property listing has been reviewed and <strong style="color:#16a34a;">approved</strong>!</p>

  <div style="background:#ffffff;border:1px solid ${BRAND.border};border-radius:8px;padding:20px;margin-bottom:24px;">
    <table style="width:100%;border-collapse:collapse;">
      ${row('Listing', propertyTitle)}
      ${row('Status', '<span style="display:inline-block;padding:3px 10px;border-radius:10px;font-size:13px;font-weight:600;background:#dcfce7;color:#166534;">Live</span>')}
    </table>
  </div>

  <div style="background:#f0fdf4;border-left:3px solid #16a34a;padding:14px 16px;border-radius:6px;font-size:14px;color:#166534;margin-bottom:24px;">
    Your listing is now visible to all buyers and renters on BuildEstate.
  </div>

  ${btn(BRAND.site + '/property/' + propertyId, 'View Your Listing')}

  <p style="font-size:13px;color:${BRAND.muted};margin:0;">Your listing will remain active for 45 days. You can manage it from <a href="${BRAND.site}/my-listings" style="color:${BRAND.color};text-decoration:none;">My Listings</a>.</p>`
);

// ─── 7. Listing Rejected ───────────────────────────────

export const getListingRejectedTemplate = (propertyTitle, reason) => wrap(
  'Update on Your Property Listing',
  `<p style="margin:0 0 20px;font-size:15px;">Thank you for submitting your property listing. After review, we were unable to approve it at this time.</p>

  <div style="background:#ffffff;border:1px solid ${BRAND.border};border-radius:8px;padding:20px;margin-bottom:24px;">
    <table style="width:100%;border-collapse:collapse;">
      ${row('Listing', propertyTitle)}
      ${row('Status', '<span style="display:inline-block;padding:3px 10px;border-radius:10px;font-size:13px;font-weight:600;background:#fee2e2;color:#991b1b;">Not Approved</span>')}
      ${row('Reason', reason || 'Please contact us for more details.')}
    </table>
  </div>

  <div style="background:#fef2f2;border-left:3px solid #dc2626;padding:14px 16px;border-radius:6px;font-size:14px;color:#991b1b;margin-bottom:24px;">
    You are welcome to revise your listing and resubmit it for review.
  </div>

  ${btn(BRAND.site + '/my-listings', 'Edit &amp; Resubmit')}

  <p style="font-size:13px;color:${BRAND.muted};margin:0;">If you have questions, reply to this email or visit our <a href="${BRAND.site}/contact" style="color:${BRAND.color};text-decoration:none;">contact page</a>.</p>`
);
// ── User Management Email Templates ──────────────────────────────────────

export const getUserSuspendedTemplate = (userName, days, reason, suspendedUntil) => wrap(
  'Account Temporarily Suspended',
  `<p style="margin:0 0 20px;font-size:15px;">Hello ${userName},</p>
  
  <p style="margin:0 0 20px;font-size:15px;">Your BuildEstate account has been temporarily suspended for ${days} day${days > 1 ? 's' : ''}. During this period, you will not be able to access your account or post new listings.</p>

  <div style="background:#ffffff;border:1px solid ${BRAND.border};border-radius:8px;padding:20px;margin-bottom:24px;">
    <table style="width:100%;border-collapse:collapse;">
      ${row('Account', userName)}
      ${row('Status', '<span style="display:inline-block;padding:3px 10px;border-radius:10px;font-size:13px;font-weight:600;background:#fef3c7;color:#92400e;">Suspended</span>')}
      ${row('Duration', `${days} day${days > 1 ? 's' : ''}`)}
      ${row('Reactivation Date', new Date(suspendedUntil).toLocaleDateString())}
      ${row('Reason', reason)}
    </table>
  </div>

  <div style="background:#fffbeb;border-left:3px solid #d97706;padding:14px 16px;border-radius:6px;font-size:14px;color:#92400e;margin-bottom:24px;">
    <strong>What happens next:</strong><br>
    • Your account will be automatically reactivated on ${new Date(suspendedUntil).toLocaleDateString()}<br>
    • Your existing listings have been temporarily hidden<br>
    • You can still receive emails about your listings
  </div>

  <p style="font-size:15px;margin:20px 0;">If you believe this suspension was made in error, please contact our support team for assistance.</p>

  ${btn(BRAND.site + '/contact', 'Contact Support')}

  <p style="font-size:13px;color:${BRAND.muted};margin:0;">This is an automated message. Please do not reply to this email.</p>`
);

export const getUserBannedTemplate = (userName, reason) => wrap(
  'Account Permanently Banned',
  `<p style="margin:0 0 20px;font-size:15px;">Hello ${userName},</p>
  
  <p style="margin:0 0 20px;font-size:15px;">After careful review, your BuildEstate account has been permanently banned due to violations of our terms of service.</p>

  <div style="background:#ffffff;border:1px solid ${BRAND.border};border-radius:8px;padding:20px;margin-bottom:24px;">
    <table style="width:100%;border-collapse:collapse;">
      ${row('Account', userName)}
      ${row('Status', '<span style="display:inline-block;padding:3px 10px;border-radius:10px;font-size:13px;font-weight:600;background:#fee2e2;color:#991b1b;">Permanently Banned</span>')}
      ${row('Effective Date', new Date().toLocaleDateString())}
      ${row('Reason', reason)}
    </table>
  </div>

  <div style="background:#fef2f2;border-left:3px solid #dc2626;padding:14px 16px;border-radius:6px;font-size:14px;color:#991b1b;margin-bottom:24px;">
    <strong>Account Impact:</strong><br>
    • You can no longer access your BuildEstate account<br>
    • All your listings have been removed from the platform<br>
    • Creating new accounts is prohibited
  </div>

  <p style="font-size:15px;margin:20px 0;">If you believe this action was taken in error, you may appeal this decision by contacting our support team within 30 days.</p>

  ${btn(BRAND.site + '/contact', 'Submit Appeal')}

  <p style="font-size:13px;color:${BRAND.muted};margin:0;">This is an automated message. Please do not reply to this email.</p>`
);

export const getUserReactivatedTemplate = (userName) => wrap(
  'Account Reactivated - Welcome Back!',
  `<p style="margin:0 0 20px;font-size:15px;">Hello ${userName},</p>
  
  <p style="margin:0 0 20px;font-size:15px;">Great news! Your BuildEstate account has been reactivated and you now have full access to all platform features.</p>

  <div style="background:#ffffff;border:1px solid ${BRAND.border};border-radius:8px;padding:20px;margin-bottom:24px;">
    <table style="width:100%;border-collapse:collapse;">
      ${row('Account', userName)}
      ${row('Status', '<span style="display:inline-block;padding:3px 10px;border-radius:10px;font-size:13px;font-weight:600;background:#dcfce7;color:#166534;">Active</span>')}
      ${row('Reactivated On', new Date().toLocaleDateString())}
    </table>
  </div>

  <div style="background:#f0fdf4;border-left:3px solid #16a34a;padding:14px 16px;border-radius:6px;font-size:14px;color:#166534;margin-bottom:24px;">
    <strong>What's restored:</strong><br>
    • Full access to your account dashboard<br>
    • Ability to post and manage listings<br>
    • Access to all BuildEstate features
  </div>

  <p style="margin:20px 0;font-size:15px;">We're glad to have you back! You can now log in and resume using BuildEstate.</p>

  ${btn(BRAND.site + '/login', 'Log In to Your Account')}

  <p style="font-size:13px;color:${BRAND.muted};margin:0;">Thank you for being part of the BuildEstate community.</p>`
);
