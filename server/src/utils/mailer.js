const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendAlertEmail = async (to, subject, text) => {
  try {
    await transporter.sendMail({
      from: '"Sundaya Warehouse Alert" <alert@sundaya.com>',
      to,
      subject,
      text,
    });
    console.log(`Alert email sent to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

module.exports = { sendAlertEmail };
