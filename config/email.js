const nodemailer = require("nodemailer");
const { setupLogging } = require("./logger");
const logger = setupLogging();

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT === "465", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    const message = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: options.email,
      subject: options.subject,
      html: options.html,
    };

    const info = await transporter.sendMail(message);
    logger.info("Email sent successfully", { messageId: info.messageId });

    return info;
  } catch (error) {
    logger.error("Email sending failed:", error);
    throw new Error("Email could not be sent");
  }
};

// Email templates
const emailTemplates = {
  welcomeEmail: (userName) => ({
    subject: "Welcome to Caring Heart & Hand",
    html: `
      <h1>Welcome to Caring Heart & Hand</h1>
      <p>Dear ${userName},</p>
      <p>Thank you for registering with Caring Heart & Hand. We're excited to have you join our family.</p>
      <p>If you have any questions, please don't hesitate to contact us.</p>
      <p>Best regards,<br>The Caring Heart & Hand Team</p>
    `,
  }),

  careRequestConfirmation: (requestDetails) => ({
    subject: "Care Request Confirmation",
    html: `
      <h1>Care Request Received</h1>
      <p>Dear ${requestDetails.name},</p>
      <p>We have received your care request and our team will review it shortly.</p>
      <p>Request Details:</p>
      <ul>
        <li>Care Type: ${requestDetails.careType}</li>
        <li>Start Date: ${new Date(
          requestDetails.startDate
        ).toLocaleDateString()}</li>
        <li>Frequency: ${requestDetails.frequency}</li>
      </ul>
      <p>We will contact you soon to discuss your care needs in detail.</p>
      <p>Best regards,<br>The Caring Heart & Hand Team</p>
    `,
  }),

  passwordReset: (resetUrl) => ({
    subject: "Password Reset Request",
    html: `
      <h1>Password Reset Request</h1>
      <p>You have requested to reset your password.</p>
      <p>Please click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>If you did not request this, please ignore this email.</p>
      <p>This link will expire in 1 hour.</p>
      <p>Best regards,<br>The Caring Heart & Hand Team</p>
    `,
  }),
};

module.exports = {
  sendEmail,
  emailTemplates,
};
