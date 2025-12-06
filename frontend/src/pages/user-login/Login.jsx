import React, { useState } from "react";
import useLoginStore from "../../store/useLoginStore";
import countries from "../../utils/countriles";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import useUserStore from "../../store/useUserStore";
import useThemeStore from "../../store/themeStore";
import { motion } from "framer-motion";
import { FaChevronDown, FaPlus, FaUser } from "react-icons/fa";
import Spinner from "../../utils/spinner";
import {
  sentOtp,
  updateUserProfile,
  verifyOtp,
  checkUserAuth,
} from "../../services/user.services";
import { toast } from "react-toastify";

// Validation schemas
const loginValidationSchema = yup
  .object()
  .shape({
    phoneNumber: yup
      .string()
      .nullable()
      .notRequired()
      .matches(/^\d+$/, "Phone number must be digits")
      .transform((value, originalValue) => {
        return originalValue.trim() === "" ? null : value;
      }),
    email: yup
      .string()
      .nullable()
      .notRequired()
      .email("Please enter a valid email")
      .transform((value, originalValue) => {
        return originalValue.trim() === "" ? null : value;
      }),
  })
  .test(
    "at-least-one",
    "Either email or phone number is required",
    function (value) {
      return !!(value.phoneNumber || value.email);
    }
  );

const otpValidationSchema = yup.object().shape({
  otp: yup
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .required("OTP is required"),
});

const profileValidationSchema = yup.object().shape({
  username: yup.string().required("Username is required"),
  agreed: yup.bool().oneOf([true], "You must agree to the terms"),
});

const avatars = [
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Mimi",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Jasper",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Luna",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Zoe",
];

const Login = () => {
  // Default step to 1 if undefined (fix for refresh)
  const {
    step = 1,
    setStep,
    setUserPhoneData,
    userPhoneData,
    resetLoginState,
  } = useLoginStore();

  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [profilePicture, setProfilePicture] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(avatars[0]);
  const [profilePictureFile, setprofilePictureFile] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, seterror] = useState("");
  const navigate = useNavigate();
  const { setUser } = useUserStore();
  const { theme } = useThemeStore();
  const [loading, setLoading] = useState(false);

  // React Hook Form for login
  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
    setValue: setLoginValue,
    getValues: getLoginValues,
  } = useForm({
    resolver: yupResolver(loginValidationSchema),
    defaultValues: {
      phoneNumber: "",
      email: "",
    },
  });

  // React Hook Form for OTP
  const {
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors },
    setValue: setOtpValue,
  } = useForm({
    resolver: yupResolver(otpValidationSchema),
  });

  // React Hook Form for profile
  const {
    register: profileRegister,
    handleSubmit: handleProfileSubmit,
    formState: { errors: ProfileErrors },
    watch
  } = useForm({
    resolver: yupResolver(profileValidationSchema),
  });

  // Filter countries for dropdown
  const filterCountries = countries.filter(
    (country) =>
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.dialCode.includes(searchTerm)
  );

  // Handle login submit
  const onLoginSubmit = async (formData) => {
    try {
      setLoading(true);
      seterror("");
      let response;

      if (formData.email) {
        response = await sentOtp(null, null, formData.email);
        // Accept both "success" and "sucess"
        if (response.status === "success" || response.status === "success") {
          toast.info("OTP sent to your email successfully");
          setUserPhoneData({ email: formData.email });
          setStep(2);
        } else {
          seterror(response.message || "Failed to send OTP to email.");
        }
      } else if (formData.phoneNumber) {
        if (!selectedCountry || !selectedCountry.dialCode) {
          seterror("Please select a country code.");
          return;
        }
        response = await sentOtp(
          formData.phoneNumber,
          selectedCountry.dialCode,
          null
        );
        if (response.status === "success" || response.status === "success") {
          toast.info("OTP sent to your phone number successfully");
          setUserPhoneData({
            phoneNumber: formData.phoneNumber,
            phoneSuffix: selectedCountry.dialCode,
          });
          setStep(2);
        } else {
          seterror(response.message || "Failed to send OTP to phone.");
        }
      } else {
        seterror("Please enter a phone number or email.");
      }
    } catch (error) {
      seterror(
        error?.data?.message ||
          error?.message ||
          "Failed to send OTP. Please check your input and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP submit
  const onOtpSubmit = async () => {
    try {
      setLoading(true);
      if (!userPhoneData) {
        throw new Error("Phone or email data is missing");
      }
      const otpString = otp.join("");
      let response;
      if (userPhoneData?.email) {
        response = await verifyOtp(null, null, otpString, userPhoneData.email);
      } else {
        response = await verifyOtp(
          userPhoneData.phoneNumber,
          userPhoneData.phoneSuffix,
          otpString
        );
      }

      if (response.status === "success" || response.status === "success") {
        toast.success("OTP verified successfully");
        const user = response.data?.user;
        if (user?.username && user?.profilePicture) {
          setUser(user);
          toast.success("Welcome back to SG Consultancy");
          navigate("/");
          resetLoginState();
        } else {
          setStep(3);
        }
      } else {
        seterror(response.message || "Failed to verify OTP");
      }
    } catch (error) {
      seterror(error.message || "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  // Handle profile picture change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setprofilePictureFile(file);
      setProfilePicture(URL.createObjectURL(file));
    }
  };

  // Handle profile submit
  const onProfileSubmit = async (data) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("username", data.username);
      formData.append("agreed", data.agreed);
      if (profilePictureFile) {
        formData.append("media", profilePictureFile);
      } else {
        formData.append("profilePicture", selectedAvatar);
      }
      const result = await updateUserProfile(formData);
      // Try to extract user from response, else call checkUserAuth as a fallback
      const updatedUser = result?.data?.user || result?.data || result?.user;
      if (updatedUser) {
        setUser(updatedUser);
      } else {
        // Fallback: verify on server and set user
        const check = await checkUserAuth();
        if (check?.isAuthenticated) setUser(check.user);
      }
      toast.success("Profile updated successfully");
      navigate("/");
      resetLoginState();
    } catch (error) {
      seterror(error.message || "Failed to update user profile");
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP input change
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpValue("otp", newOtp.join(""));
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  // Progress bar
  const progressBar = () => (
    <div
      className={`w-full ${
        theme === "dark" ? "bg-gray-700" : "bg-gray-200"
      } rounded-full h-2.5 mb-6`}
    >
      <div
        className="bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-in-out"
        style={{ width: `${(step / 3) * 100}%` }}
      ></div>
    </div>
  );

  // Handle back
  const handleBack = () => {
    setStep(1);
    setUserPhoneData(null);
    setOtp(["", "", "", "", "", ""]);
    seterror(null);
  };

  return (
    <div
      className={`min-h-screen ${
        theme === "dark"
          ? "bg-gray-900"
          : "bg-gradient-to-br from-green-400 to-blue-500"
      } flex items-center justify-center p-4 overflow-hidden`}
    >
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`${
          theme === "dark" ? "bg-gray-800 text-white" : "bg-white"
        } p-6 md:p-8 rounded-lg shadow-2xl w-full max-w-md relative z-10`}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            duration: 0.2,
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
          className="w-24 h-24 bg-white rounded-full mx-auto mb-6 flex items-center justify-center p-2"
        >
          <img src="/logo2.png" alt="SG Consultancy" className="w-full h-full object-contain" />
        </motion.div>

        <h1
          className={`text-3xl font-bold text-center mb-6 ${
            theme === "dark" ? "text-white" : "text-gray-800"
          }`}
        >
          SG Consultancy Login
        </h1>
        {progressBar()}
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {step === 1 && (
          <form
            className="space-y-4"
            onSubmit={handleLoginSubmit(onLoginSubmit)}
            autoComplete="off"
          >
            <p
              className={`text-center ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              } mb-4`}
            >
              Enter your phone number or email to receive an OTP
            </p>

            <div className="relative">
              <div className="flex">
                <div className="relative w-1/3">
                  <button
                    type="button"
                    className={`flex-shrink-0 z-10 inline-flex items-center py-2.5 px-4 text-sm font-medium text-center border ${
                      theme === "dark"
                        ? "text-white bg-gray-700 border-gray-600"
                        : "text-gray-900 bg-gray-100 border-gray-300"
                    } rounded-s-lg hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-gray-100`}
                    onClick={() => setShowDropdown(!showDropdown)}
                    style={{
                      fontFamily:
                        "'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif",
                    }}
                  >
                    <span>
                      {selectedCountry.flag} {selectedCountry.dialCode}
                    </span>
                    <FaChevronDown className="ml-2" />
                  </button>
                  {showDropdown && (
                    <div
                      className={`absolute z-10 w-full mt-1 ${
                        theme === "dark"
                          ? "bg-gray-700 border-gray-600"
                          : "bg-white border-gray-300"
                      } border rounded-md shadow-lg max-h-60 overflow-auto`}
                    >
                      <div
                        className={`sticky top-0 ${
                          theme === "dark" ? "bg-gray-700" : "bg-white"
                        } p-2`}
                      >
                        <input
                          type="text"
                          placeholder="Search country..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className={`w-full px-2 py-1 border ${
                            theme === "dark"
                              ? "bg-gray-600 border-gray-500 text-white"
                              : "bg-white border-gray-300"
                          } rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500`}
                        />
                      </div>
                      {filterCountries.map((country) => (
                        <button
                          key={country.alpha2}
                          type="button"
                          className={`w-full text-left px-3 py-2 ${
                            theme === "dark"
                              ? "hover:bg-gray-600"
                              : "hover:bg-gray-100"
                          } focus:outline-none`}
                          onClick={() => {
                            setSelectedCountry(country);
                            setShowDropdown(false);
                          }}
                          style={{
                            fontFamily:
                              "'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif",
                          }}
                        >
                          <span className="mr-2">{country.flag}</span>
                          <span className="mr-2">{country.dialCode}</span>
                          <span>{country.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  {...loginRegister("phoneNumber")}
                  placeholder="Phone number"
                  className={`w-2/3 px-4 py-2 border ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300"
                  } rounded-md  focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    loginErrors.phoneNumber ? "border-red-500" : ""
                  }`}
                  autoComplete="off"
                />
              </div>
              {loginErrors.phoneNumber && (
                <p className="text-red-500 text-sm">
                  {loginErrors.phoneNumber.message}
                </p>
              )}
            </div>

            {/* Divider with or */}
            <div className="flex items-center my-4">
              <div className="flex-grow h-px bg-gray-300" />
              <span className="mx-3 text-gray-500 text-sm font-medium">or</span>
              <div className="flex-grow h-px bg-gray-300" />
            </div>

            {/* Email input box */}
            <div
              className={`flex items-center border rounded-md px-3 py-2 ${
                theme === "dark"
                  ? "bg-gray-700 border-gray-600"
                  : "bg-white border-gray-600"
              }`}
            >
              <FaUser
                className={`mr-2 text-gray-400 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              />
              <input
                type="text"
                {...loginRegister("email")}
                placeholder="Email (optional)"
                className={`w-full bg-transparent focus:outline-none ${
                  theme === "dark" ? "text-white" : "text-black"
                } ${loginErrors.email ? "border-red-500" : ""}`}
                autoComplete="off"
              />
            </div>
            {loginErrors.email && (
              <p className="text-red-500 text-sm">
                {loginErrors.email.message}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition"
              disabled={loading}
            >
              {loading ? <Spinner /> : "Send OTP"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleOtpSubmit(onOtpSubmit)} className="space-y-4">
            <p
              className={`text-center ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              } mb-4`}
            >
              Please enter the six digit OTP sent to your{" "}
              {userPhoneData?.phoneSuffix
                ? `${userPhoneData.phoneSuffix} ${userPhoneData.phoneNumber}`
                : "email"}
            </p>
            <div className="flex justify-between">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  className={`w-12 h-12 border text-center ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300"
                  } rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    otpErrors.otp ? "border-red-500" : ""
                  }`}
                  autoComplete="off"
                />
              ))}
            </div>
            {otpErrors.otp && (
              <p className="text-red-500 text-sm">{otpErrors.otp.message}</p>
            )}
            <button
              type="submit"
              className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition"
              disabled={loading}
            >
              {loading ? <Spinner /> : "Verify OTP"}
            </button>
            <button
              type="button"
              className="w-full mt-2 bg-gray-400 text-white py-2 rounded-md hover:bg-gray-500 transition"
              onClick={handleBack}
              disabled={loading}
            >
              Back
            </button>
          </form>
        )}

        {step === 3 && (
          <form
            onSubmit={handleProfileSubmit(onProfileSubmit)}
            className="space-y-4"
          >
            <div className="flex flex-col items-center mb-4">
              <div className="relative w-24 h-24 mb-2">
                <img
                  src={profilePicture || selectedAvatar}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                />

                <label
                  htmlFor="profile-picture"
                  className="absolute bottom-0 right-0 bg-green-500 text-white p-2 rounded-full cursor-pointer hover:bg-green-600 transition duration-300"
                >
                  <FaPlus className="w-4 h-4" />
                </label>
                <input
                  type="file"
                  id="profile-picture"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <p
                className={`text-sm ${
                  theme === "dark" ? "text-gray-300" : "text-gray-500"
                } mb-2`}
              >
                Choose An Avatar
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {avatars.map((avatar, index) => (
                  <img
                    key={index}
                    src={avatar}
                    alt={`Avatar ${index + 1}`}
                    className={`w-12 h-12 rounded-full transition duration-300 ease-in-out cursor-pointer  transform hover:scale-110 ${
                      selectedAvatar === avatar ? "ring-2 ring-green-500" : ""
                    }`}
                    onClick={() => setSelectedAvatar(avatar)}
                  />
                ))}
              </div>
            </div>
            <div className="relative">
              <FaUser
                className={`absolute left-3 top-1/2  transform -translate-y-1/2  ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              />
              <input
                {...profileRegister("username")}
                type="text"
                placeholder="Username"
                className={`w-full pl-10 pr-3 py-2 border ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300"
                } rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-lg`}
              />
              {ProfileErrors.username && (
                <p className="text-red-500 text-sm mt-1">
                  {ProfileErrors.username.message}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                {...profileRegister("agreed")}
                type="checkbox"
                className={`rounded ${
                  theme === "dark"
                    ? "bg-gray-700 text-green-500"
                    : "text-gray-500"
                }  focus:ring-green-500`}
              />
              <label
                htmlFor="terms"
                className={`text-sm ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}
              >
                I agree to the{" "}
                <a href="#" className="text-green-500 hover:underline">
                  Terms and Conditions
                </a>
              </label>
              </div>
              {ProfileErrors.agreed && (
                <p className="text-red-500 text-sm mt-1">
                  {ProfileErrors.agreed.message}
                </p>
              )}

              <button
                type="submit"
                disabled={!watch("agreed") || loading}
                className={`w-full bg-green-500 text-white font-bold  py-3 rounded-md hover:scale-105 transition duration-300 ease-in-out transform flex items-center justify-center text-lg
              ${loading ? "opacity-50 cursor-not-allowed" : ""}
              `}
              >
                {loading ? <Spinner /> : "Create Profile"}
              </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default Login;
