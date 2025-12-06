import axiosInstance from "./url.service";

// Get all statuses
export const getStatuses = async () => {
  try {
    const response = await axiosInstance.get("/status/");
    return response.data;
  } catch (error) {
    throw error.response ? error.response : error.message;
  }
};

// Create new status
export const createStatus = async (statusData) => {
  try {
    const response = await axiosInstance.post("/status/", statusData);
    return response.data;
  } catch (error) {
    throw error.response ? error.response : error.message;
  }
};

// Create status with file
export const createStatusWithFile = async (formData) => {
  try {
    const response = await axiosInstance.post("/status/", formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response : error.message;
  }
};

// View status
export const viewStatus = async (statusId) => {
  try {
    const response = await axiosInstance.put(`/status/${statusId}/view`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response : error.message;
  }
};

// Delete status
export const deleteStatus = async (statusId) => {
  try {
    const response = await axiosInstance.delete(`/status/${statusId}`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response : error.message;
  }
};
