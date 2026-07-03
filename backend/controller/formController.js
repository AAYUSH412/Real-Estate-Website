import Form from '../models/formModel.js';
import emailService from '../services/emailService.js';

const escHtml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const submitForm = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    const newForm = new Form({ name, email, phone, message });
    await newForm.save();

    // Notify admin (non-fatal)
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head><body>
        <h2 style="font-family:sans-serif;">New Contact Form Submission</h2>
        <table style="font-family:sans-serif;border-collapse:collapse;">
          <tr><td style="padding:6px 12px;color:#6B7280;">Name</td><td style="padding:6px 12px;font-weight:600;">${escHtml(name)}</td></tr>
          <tr><td style="padding:6px 12px;color:#6B7280;">Email</td><td style="padding:6px 12px;font-weight:600;">${escHtml(email)}</td></tr>
          <tr><td style="padding:6px 12px;color:#6B7280;">Phone</td><td style="padding:6px 12px;font-weight:600;">${escHtml(phone || '—')}</td></tr>
          <tr><td style="padding:6px 12px;color:#6B7280;vertical-align:top;">Message</td><td style="padding:6px 12px;">${escHtml(message)}</td></tr>
        </table>
      </body></html>`;
      emailService.sendEmailSafely(adminEmail, `New Contact: ${name}`, html);
    }

    res.json({ message: 'Form submitted successfully' });
  } catch (error) {
    console.error('Error saving form data:', error);
    res.status(500).json({ message: 'Server error' });
  }
};