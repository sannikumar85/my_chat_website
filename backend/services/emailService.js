const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App Password
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("Error in email configuration:");
  } else {
    console.log("Email service is ready to send messages.");
  }
});

const sendOtpToEmail = async (email, otp) => {
  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #1B5E8C;">🔐 SG Consultancy Chat Verification</h2>
      
      <p>Hi there,</p>
      
      <p>Your one-time password (OTP) to verify your SG Consultancy Chat account is:</p>
      
      <h1 style="background: #e0f7fa; color: #000; padding: 10px 20px; display: inline-block; border-radius: 5px; letter-spacing: 2px;">
        ${otp}
      </h1>

      <p><strong>This OTP is valid for the next 5 minutes.</strong> Please do not share this code with anyone.</p>

      <p>If you didn’t request this OTP, please ignore this email.</p>

      <p style="margin-top: 20px;">Thanks & Regards,<br/>SG Consultancy Chat Security Team</p>

      <hr style="margin: 30px 0;" />

      <small style="color: #777;">This is an automated message. Please do not reply.</small>
    </div>
  `;
  await transporter.sendMail({
    from: `SG Consultancy Chat < ${process.env.EMAIL_USER}`,
    to: email,
    subject: "SG Consultancy Chat OTP Verification",
    html,
  });
};

module.exports = {
  sendOtpToEmail,
};
