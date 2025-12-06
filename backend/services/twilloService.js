const { model } = require("mongoose");
const twillo = require("twilio");

//twillo cerditentials
const accountSid = process.env.TWILLO_ACCOUNT_SID;
const authToken = process.env.TWILLO_AUTH_TOKEN;
const servicSid = process.env.TWILLO_SERVICE_SID;

const client = twillo(accountSid, authToken);

//send otp to phonr number
const sendOtpToPhoneNumber = async (phoneNumber) => {
  try {
    console.log("Sending OTP to phone number:", phoneNumber);
    if (!phoneNumber) {
      throw new Error("Phone number is required");
    }
    const response = await client.verify.v2
      .services(servicSid)
      .verifications.create({
        to: phoneNumber,
        channel: "sms",
      });

    console.log("OTP sent successfully:", response);
    return response;
  } catch (error) {
    console.error("Error sending OTP:", error);
    throw  new Error("Failed to send OTP");
  }
};

//verify otp
const verifyOtp = async (phoneNumber, otp) => {
  try {
    console.log("this is my otp", otp);
    console.log("this number", phoneNumber);

    const response = await client.verify.v2
      .services(servicSid)
      .verificationChecks.create({
        to: phoneNumber,
        code: otp,
      });

      console.log("OTP verification response:", response);
      return response;
  } catch (error) {
    console.error( error);
    throw new Error("Failed to verify OTP");
  }
};


module.exports = {
  sendOtpToPhoneNumber,
  verifyOtp
};