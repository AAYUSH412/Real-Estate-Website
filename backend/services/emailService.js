/**
 * Consolidated Email Service
 *
 * Centralizes all email sending functionality to eliminate duplicate code
 * across controllers. Provides a consistent interface for sending different
 * types of emails with proper error handling and logging.
 */

import { sendEmail } from '../config/nodemailer.js';
import {
  getSchedulingEmailTemplate,
  getEmailTemplate,
  getNewsletterTemplate,
  getWelcomeTemplate,
  getEmailVerificationTemplate,
  getPasswordResetTemplate,
  getListingApprovedTemplate,
  getListingRejectedTemplate,
  getUserSuspendedTemplate,
  getUserBannedTemplate,
  getUserReactivatedTemplate
} from '../email.js';

class EmailService {
  constructor() {
    this.fromAddress = process.env.EMAIL_USER || 'noreply@buildestate.com';
  }

  /**
   * Base email sending method with error handling and logging
   */
  async sendEmail(to, subject, htmlContent, options = {}) {
    try {
      const mailOptions = {
        from: this.fromAddress,
        to,
        subject,
        html: htmlContent,
        ...options
      };

      console.log(`📧 Sending email: ${subject} to ${to}`);
      const result = await sendEmail(mailOptions);
      console.log(`✅ Email sent successfully: ${subject} to ${to}`);

      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`❌ Failed to send email: ${subject} to ${to}`, error);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  /**
   * Send appointment scheduling confirmation email
   */
  async sendAppointmentScheduled(userEmail, appointment, date, time, notes = '') {
    const subject = `Appointment Scheduled - ${appointment.propertyId.title}`;
    const htmlContent = getSchedulingEmailTemplate(appointment, date, time, notes);

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  /**
   * Send appointment status update email
   */
  async sendAppointmentStatusUpdate(userEmail, appointment, status) {
    const subject = `Appointment ${status.charAt(0).toUpperCase() + status.slice(1)} - ${appointment.propertyId.title}`;
    const htmlContent = getEmailTemplate(appointment, status);

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(userEmail, userName) {
    const subject = 'Welcome to BuildEstate - Your Account is Ready!';
    const htmlContent = getWelcomeTemplate(userName);

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  /**
   * Send email verification link to new users
   */
  async sendEmailVerification(userEmail, userName, verificationUrl) {
    const subject = 'Verify Your BuildEstate Email Address';
    const htmlContent = getEmailVerificationTemplate(userName, verificationUrl);

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(userEmail, resetUrl) {
    const subject = 'Reset Your BuildEstate Password';
    const htmlContent = getPasswordResetTemplate(resetUrl);

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  /**
   * Send newsletter subscription confirmation email
   */
  async sendNewsletterWelcome(userEmail) {
    const subject = 'Welcome to BuildEstate Newsletter 📧';
    const htmlContent = getNewsletterTemplate(userEmail);

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  /**
   * Send listing approved notification email
   */
  async sendListingApproved(userEmail, propertyTitle, propertyId) {
    const subject = '🎉 Your Property Listing is Now Live!';
    const htmlContent = getListingApprovedTemplate(propertyTitle, propertyId);

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  /**
   * Send listing rejected notification email
   */
  async sendListingRejected(userEmail, propertyTitle, reason) {
    const subject = 'Update on Your Property Listing Submission';
    const htmlContent = getListingRejectedTemplate(propertyTitle, reason);

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  /**
   * Send appointment notification to admin
   */
  async sendAppointmentNotificationToAdmin(appointment, userDetails) {
    const subject = `New Appointment Request - ${appointment.propertyId.title}`;
    const htmlContent = `
      <h2>New Appointment Request</h2>
      <p><strong>Property:</strong> ${appointment.propertyId.title}</p>
      <p><strong>User:</strong> ${userDetails.name} (${userDetails.email})</p>
      <p><strong>Phone:</strong> ${userDetails.phone}</p>
      <p><strong>Date:</strong> ${new Date(appointment.date).toLocaleDateString()}</p>
      <p><strong>Time:</strong> ${appointment.time}</p>
      ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
    `;

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@buildestate.com';
    return await this.sendEmail(adminEmail, subject, htmlContent);
  }

  /**
   * Send bulk emails with proper error handling for each recipient
   */
  async sendBulkEmails(recipients, subject, htmlContent) {
    const results = [];

    for (const recipient of recipients) {
      try {
        const result = await this.sendEmail(recipient, subject, htmlContent);
        results.push({ email: recipient, success: true, ...result });
      } catch (error) {
        console.error(`Failed to send email to ${recipient}:`, error);
        results.push({ email: recipient, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`📊 Bulk email results: ${successCount} sent, ${failureCount} failed`);

    return {
      totalSent: successCount,
      totalFailed: failureCount,
      results
    };
  }

  /**
   * Safe email sending with graceful error handling
   * Use this when email failure shouldn't break the main operation
   */
  async sendEmailSafely(to, subject, htmlContent, options = {}) {
    try {
      return await this.sendEmail(to, subject, htmlContent, options);
    } catch (error) {
      console.error(`Email send failed gracefully: ${error.message}`);
      // Return a result indicating failure but don't throw
      return { success: false, error: error.message };
    }
  }

  // ── User Management Email Methods ──────────────────────────────────────

  /**
   * Send user suspended notification email
   */
  async sendUserSuspended(userEmail, userName, days, reason, suspendedUntil) {
    const subject = `BuildEstate Account Suspended - ${days} Day${days > 1 ? 's' : ''}`;
    const htmlContent = getUserSuspendedTemplate(userName, days, reason, suspendedUntil);

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  /**
   * Send user banned notification email
   */
  async sendUserBanned(userEmail, userName, reason) {
    const subject = 'BuildEstate Account Permanently Banned';
    const htmlContent = getUserBannedTemplate(userName, reason);

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  /**
   * Send user reactivated notification email
   */
  async sendUserReactivated(userEmail, userName) {
    const subject = 'BuildEstate Account Reactivated - Welcome Back!';
    const htmlContent = getUserReactivatedTemplate(userName);

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  /**
   * Get email service health status
   */
  async getHealthStatus() {
    try {
      // Test basic configuration
      if (!process.env.BREVO_API_KEY) {
        return { status: 'error', message: 'BREVO_API_KEY not configured' };
      }

      return {
        status: 'healthy',
        message: 'Email service operational',
        provider: 'Brevo REST API',
        fromAddress: this.fromAddress
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

export default emailService;

// Also export individual methods for backward compatibility
export const {
  sendAppointmentScheduled,
  sendAppointmentStatusUpdate,
  sendWelcomeEmail,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendNewsletterWelcome,
  sendListingApproved,
  sendListingRejected,
  sendAppointmentNotificationToAdmin,
  sendBulkEmails,
  sendEmailSafely,
  sendUserSuspended,
  sendUserBanned,
  sendUserReactivated
} = emailService;