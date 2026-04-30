const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS
  ? process.env.EMAIL_PASS.replace(/\s+/g, "")
  : "";
const smtpHost = process.env.EMAIL_HOST;
const smtpPort = process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined;
const smtpSecure = process.env.EMAIL_SECURE === "true";
const isEmailConfigured = Boolean(emailUser && emailPass);

if (!isEmailConfigured) {
  console.warn(
    "Email service not configured. Set EMAIL_USER and EMAIL_PASS (Gmail app password) in backend/.env."
  );
}

const transporter = isEmailConfigured
  ? nodemailer.createTransport(
      smtpHost
        ? {
            host: smtpHost,
            port: smtpPort || 587,
            secure: smtpSecure,
            auth: {
              user: emailUser,
              pass: emailPass,
            },
          }
        : {
            service: "gmail",
            auth: {
              user: emailUser,
              pass: emailPass,
            },
          }
    )
  : null;

if (transporter) {
  transporter.verify((error) => {
    if (error) {
      console.error("Error in email configuration:", error.message);
    } else {
      console.log("Email service is ready to send messages.");
    }
  });
}

const sendOtpToEmail = async (email, otp) => {
  if (!isEmailConfigured || !transporter) {
    throw new Error(
      "Email service not configured. Set EMAIL_USER and EMAIL_PASS (Gmail app password)."
    );
  }
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
  try {
    await transporter.sendMail({
      from: `SG Consultancy Chat <${emailUser}>`,
      to: email,
      subject: "SG Consultancy Chat OTP Verification",
      html,
    });
  } catch (error) {
    if (error && (error.code === "EAUTH" || String(error.message).includes("535"))) {
      throw new Error(
        "Email authentication failed. Use a Gmail App Password (16 chars) and ensure 2FA is enabled."
      );
    }
    throw error;
  }
};

module.exports = {
  sendOtpToEmail,
};
