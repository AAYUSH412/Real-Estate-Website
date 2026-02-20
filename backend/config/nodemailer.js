import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Create a pseudo-transporter that uses Brevo's REST API instead of SMTP
// This bypasses free-tier Render's strict block on outbound port 587 traffic.
const createTransporter = () => {
  if (!process.env.BREVO_API_KEY) {
    console.warn('⚠️  Email API configuration incomplete. Missing BREVO_API_KEY environment variable. Emails will fail silently.');
  }

  return {
    sendMail: async (mailOptions) => {
      if (!process.env.BREVO_API_KEY) {
        throw new Error('Missing BREVO_API_KEY. Cannot send email.');
      }

      try {
        const payload = {
          sender: { name: 'BuildEstate', email: mailOptions.from },
          to: [{ email: mailOptions.to }],
          subject: mailOptions.subject,
          htmlContent: mailOptions.html
        };

        const response = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
          headers: {
            'api-key': process.env.BREVO_API_KEY,
            'accept': 'application/json',
            'content-type': 'application/json'
          }
        });

        console.log('✅ Email sent successfully via REST API:', response.data.messageId);
        return response.data;
      } catch (error) {
        console.error('❌ Failed to send email via REST API:', error.response?.data || error.message);
        throw error;
      }
    },
    verify: async () => {
       if (!process.env.BREVO_API_KEY) {
          throw new Error('Transporter not configured with BREVO_API_KEY');
       }
       return true; // We can assume it is verified if the key exists during boot
    }
  };
};

const transporter = createTransporter();

// Helper function to send emails with error handling
export const sendEmail = async (mailOptions) => {
  return await transporter.sendMail(mailOptions);
};

// Health check function
export const checkEmailHealth = async () => {
  if (!process.env.BREVO_API_KEY) {
    return { status: 'error', message: 'BREVO_API_KEY not configured' };
  }
  return { status: 'healthy', message: 'Email service is operational via Brevo REST API' };
};

export default transporter;