const { uploadFileToCloudinary } = require("../config/cloudinaryConfig");
const Status = require("../models/Status");
const response = require("../utils/responseHandler");
const Message = require("../models/Message");

exports.createStatus = async (req, res) => {
  try {
    const { content, contentType } = req.body;
    const userId = req.user.userId;
    
    // Handle file upload - with .any() middleware, files are in req.files array
    const file = req.files && req.files.length > 0 ? req.files[0] : null;

    let mediaUrl = null;
    let finalContentType = contentType || "text";

    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);
      if (!uploadFile?.secure_url) {
        return response(res, 400, "File upload failed");
      }
      mediaUrl = uploadFile?.secure_url;

      if (file.mimetype.startsWith("image/")) {
        finalContentType = "image";
      } else if (file.mimetype.startsWith("video")) {
        finalContentType = "video";
      } else {
        return response(res, 400, "Invalid file type");
      }
    } else if (content?.trim()) {
      finalContentType = "text";
    } else {
      return response(res, 400, "Invalid content");
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const status = new Status({
      user: userId,
      content: finalContentType === "text" ? content : null,
      imageOrVideoUrl: mediaUrl,
      contentType: finalContentType,
      expiresAt,
    });
    await status.save();

    const populatedStatus = await Status.findById(status?._id)
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture");

    if (req.io && req.socketUserMap) {
      // brodcast stauss
      for (const [connectingUserId, socketId] of req.socketUserMap) {
        if (connectingUserId !== userId) {
          req.io.to(socketId).emit("new_status", populatedStatus);
        }
      }
    }

    return response(res, 200, "statuses created successfully", populatedStatus);
  } catch (error) {
    return response(res, 500, "Internal server error");
  }
};

exports.getStatuses = async (req, res) => {
  try {
    const statuses = await Status.find({
      expiresAt: { $gt: new Date() },
    })
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture")
      .sort({ createdAt: -1 });

    return response(res, 200, "Statuses fetched successfully", statuses);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

exports.viewStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;
  try {
    const status = await Status.findById(statusId);

    if (!status) {
      return response(res, 404, "Status not found");
    }
    if (!status.viewers.includes(userId)) {
      status.viewers.push(userId);
      await status.save();

      const updateStatus = await Status.findById(statusId)
        .populate("user", "username profilePicture")
        .populate("viewers", "username profilePicture");

      //emit socket event
      if (req.io && req.socketUserMap) {
        // brodcast stauss
        const statusOwnerSocket = req.socketUserMap.get(
          status.user._id.toString()
        );
        if (statusOwnerSocket) {
          const viewData = {
            statusId,
            viewerId: userId,
            totalViewer: updateStatus.viewers.length,
            viewers: updateStatus.viewers,
          };

          req.io.to(statusOwnerSocket).emit("status viewd", viewData);
        } else {
          console.log("stastus owner and notconnected ");
        }
      }
      return response(res, 200, "Status viewed successfully", updateStatus);
    } else {
      console.log("User already viewed this status");
      return response(res, 200, "User already viewed this status", status);
    }
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

exports.deleteStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;

  try {
    const status = await Status.findById(statusId);

    if (!status) {
      return response(res, 404, "Status not found");
    }

    if (status.user.toString() !== userId) {
      return response(res, 403, "You are not authorized to delete this status");
    }

    await status.deleteOne();

    //socket delkte

    if (req.io && req.socketUserMap) {
      for (const [connectingUserId, socketId] of req.socketUserMap) {
        if (connectingUserId !== userId) {
          req.io.to(socketId).emit("status_deleted", statusId);
        }
      }
    }

    return response(res, 200, "Status deleted successfully");
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};
