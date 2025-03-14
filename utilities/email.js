const nodemailer = require("nodemailer");

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER, // your Outlook/Office 365 email address
    pass: process.env.EMAIL_PASSWORD, // your Outlook/Office 365 password
  },
  tls: {
    ciphers: "SSLv3",
  },
});

// Function to send notification email
const sendRequestNotification = async (requestData) => {
  try {
    const emailContent = `
        <h2>New Care Request Submitted</h2>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        
        <h3>Requester Information:</h3>
        <p><strong>Name:</strong> ${requestData.firstName} ${
      requestData.lastName
    }</p>
        <p><strong>Email:</strong> ${requestData.email}</p>
        <p><strong>Phone:</strong> ${requestData.phone}</p>
        
        <h3>Care Details:</h3>
        <p><strong>Type of Care:</strong> ${requestData.careType}</p>
        <p><strong>Start Date:</strong> ${requestData.startDate}</p>
        <p><strong>Frequency:</strong> ${requestData.frequency}</p>
        <p><strong>Preferred Time:</strong> ${
          requestData.preferredTime || "Not specified"
        }</p>
        
        <h3>Recipient Information:</h3>
        <p><strong>Name:</strong> ${requestData.recipientName}</p>
        <p><strong>Age:</strong> ${requestData.recipientAge}</p>
        <p><strong>Mobility Status:</strong> ${requestData.mobilityStatus}</p>
        
        <p>Please login to the admin dashboard to review this request.</p>
      `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL, // Set this in your .env file
      subject: "New Care Request from Caring Heart & Hand",
      html: emailContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email notification:", error);
    return false;
  }
};

module.exports = { sendRequestNotification };
