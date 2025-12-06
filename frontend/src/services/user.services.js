import axiosInstance from "./url.service";

// Send OTP (phone or email)
export const sentOtp = async (phoneNumber, phoneSuffix, email) => {
  try {
    const body = {};
    if (email) body.email = email;
    if (phoneNumber && phoneSuffix) {
      body.phoneNumber = phoneNumber;
      body.phoneSuffix = phoneSuffix;
    }
    const response = await axiosInstance.post("/auth/send-otp", body);
    return response.data;
  } catch (error) {
    throw error.response ? error.response : error.message;
  }
};

// Verify OTP (phone or email)
export const verifyOtp = async (phoneNumber, phoneSuffix, otp, email) => {
  try {
    const body = {};
    if (email) body.email = email;
    if (phoneNumber && phoneSuffix) {
      body.phoneNumber = phoneNumber;
      body.phoneSuffix = phoneSuffix;
    }
    body.otp = otp;
    const response = await axiosInstance.post("/auth/verify-otp", body);
    return response.data;
  } catch (error) {
    throw error.response ? error.response : error.message;
  }
};

export const updateUserProfile = async (updateData) => {
  try {
    const response = await axiosInstance.put(
      "/auth/update-profile",
      updateData
    );
    return response.data;
  } catch (error) {
    throw error.response ? error.response : error.message;
  }
};

export const checkUserAuth = async () => {
  try {
    const response = await axiosInstance.get("/auth/check-auth");
    const status = (response?.data?.status || "").toLowerCase();
    // Accept both correct and misspelled statuses from backend
    if (status === "success" || status === "sucess") {
      // backend might return user in different fields
      const user = response?.data?.data || response?.data?.user || null;
      return { isAuthenticated: true, user };
    }

    // Treat any explicit error as unauthenticated
    if (status === "error") {
      return { isAuthenticated: false };
    }

    // Fallback: if response has user data assume authenticated
    const fallbackUser = response?.data?.data || response?.data?.user || null;
    if (fallbackUser) return { isAuthenticated: true, user: fallbackUser };
    return { isAuthenticated: false };
  } catch (error) {
    throw error.response ? error.response : error.message;
  }
};

export const logoutUser = async () => {
  try {
    const response = await axiosInstance.get('/auth/logout');
    return response.data;
  } catch (error) {
    throw error.response ? error.response : error.message;
  }
};

export const getAllUsers = async () => {
  try {
    const response = await axiosInstance.get('/auth/users');
    return response.data;
  } catch (error) {
    throw error.response ? error.response : error.message;
  }
};