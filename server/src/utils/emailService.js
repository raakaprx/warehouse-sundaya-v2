const nodemailer = require('nodemailer');

const emailEnabled = process.env.EMAIL_DISABLED !== 'true' && process.env.EMAIL_USER && process.env.EMAIL_PASS;
const transporter = emailEnabled ? nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
}) : null;

if (emailEnabled && transporter) {
  transporter.verify(function (error, success) {
    if (error) {
      console.log('SMTP Verification Error: Silakan periksa EMAIL_USER dan EMAIL_PASS di file .env');
      console.log(error);
    } else {
      console.log('Server is ready to take our messages');
    }
  });
}

/**
 * Send email notification
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Email content
 */
const sendEmail = async (to, subject, text) => {
  if (!emailEnabled || !transporter) {
    return null;
  }

  try {
    const mailOptions = {
      from: `"Sundaya Warehouse Alert" <${process.env.EMAIL_USER}>`,
      to,
      subject: `[SUNDAYA-WAREHOUSE] ${subject}`,
      text,
      html: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 600px; margin: auto;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #e11d48; margin: 0; font-size: 24px;">Sundaya Warehouse</h1>
                <p style="color: #64748b; font-size: 14px;">Ecosystem Management System</p>
              </div>
              <div style="padding: 20px; background-color: #f8fafc; border-radius: 8px; border-left: 4px solid #e11d48;">
                <p style="color: #1e293b; font-size: 16px; line-height: 1.6; margin: 0;">${text}</p>
              </div>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
              <p style="font-size: 12px; color: #94a3b8; text-align: center;">
                Ini adalah notifikasi otomatis dari sistem warehouse. Mohon tidak membalas email ini.<br>
                &copy; ${new Date().getFullYear()} PT Sundaya Indonesia.
              </p>
            </div>`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    // Don't throw error to avoid breaking the main flow
    return null;
  }
};

module.exports = { sendEmail };
