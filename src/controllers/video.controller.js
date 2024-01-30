import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import mongoose, { isValidObjectId } from "mongoose";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

// ---------- publishVideo ------------
const publishVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!title || !description) {
    throw new ApiError(401, "All fields are required");
  }

  const videoFileLocalPath = req.files?.videoFile[0].path;
  if (!videoFileLocalPath) {
    throw new ApiError(400, "Video file is required");
  }

  const thumbnailLocalPath = req.files?.thumbnail[0].path;
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "thumbnail file is required");
  }

  let videoFile;
  if (req.files.videoFile[0].size <= 100 * 1024 * 1024) {
    videoFile = await uploadOnCloudinary(videoFileLocalPath);
  } else {
    throw new ApiError(400, "upload video less than or equal to 100MB");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile || !thumbnail) {
    throw new ApiError(400, "Error while uploading on cloudinary");
  }

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(400, "User not found");
  }

  const video = await Video.create({
    videoFile: {
      url: videoFile.url,
      secure_url: videoFile.secure_url,
      public_id: videoFile.public_id,
    },
    thumbnail: {
      url: thumbnail.url,
      secure_url: thumbnail.secure_url,
      public_id: thumbnail.public_id,
    },
    title: title,
    description: description,
    duration: videoFile.duration,
    views: 0,
    owner: user._id,
  });

  const createVideo = await Video.findById(video._id);
  if (!createVideo) {
    throw new ApiError(
      400,
      "something went wrong with server while publishing video"
    );
  }
  return res
    .status(200)
    .json(new ApiResponse(200, createVideo, "video published succesfully"));
});

// -------- getAllvideo -------------------
const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  if (!isValidObjectId(userId)) {
    throw new ApiError(401, "Invalid user ID");
  }
  if (!query || !sortBy || !sortType) {
    throw new ApiError(400, "all fields are required");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(400, "user not found");
  }

  const options = {
    page: parent(page),
    limit: parseInt(limit),
  };

  await Video.createIndexes({ title: "text", description: "text" });

  const allVideos = Video.aggregate([
    {
      $match: {
        $text: { $search: query },
      },
    },
    {
      $sort: {
        score: { $meta: "textScore" },
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullname: 1,
              username: 1,
              avtar: 1,
            },
          },
        ],
      },
    },
  ]);

  try {
    const listVideos = await Video.aggregatePaginate(allVideos, options);
    if (listVideos.docs.length === 0) {
      res.status(200).json(new ApiResponse(200, {}, "user do not have videos"));
    }
    return res
      .status(200)
      .json(
        new ApiResponse(200, listVideos, "videos list fetched successfully")
      );
  } catch (error) {
    throw new ApiError(
      400,
      error.message || "something went wrong with paginationn"
    );
  }
});

// ---------- get videoby id ------------
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const isVideoExist = await Video.findById(videoId);

  if (!isVideoExist) {
    throw new ApiError(404, "Video not found");
  }

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "_id",
        as: "video",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_d",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video",
        as: "comments",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullname: 1,
              username: 1,
              avtar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
        subscribersCount: {
          $size: "$subscribers",
        },
        likesCount: {
          $size: "$likes",
        },
        commentsCount: {
          $size: "$comments",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
        video: { $first: "$video" },
      },
    },
    {
      $project: {
        video: 1,
        owner: 1,
        subscribersCount: 1,
        likesCount: 1,
        commentsCount: 1,
        isSubscribed: 1,
        comments: 1,
      },
    },
  ]);

  if (!video) {
    throw new ApiError(400, "video not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, video, "video fetched succesfully"));
});

// --------------update video ----------------
const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }
  const { title, description } = req.body;

  if (!title || !description) {
    throw new ApiError(401, "All field are required");
  }

  const oldvideo = await User.findById(videoId);
  if (!oldvideo) {
    throw new ApiError(404, "video not found");
  }

  const thumbnailLocalPath = req.file?.path;
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "thumbnail file is required");
  }

  const thumbnailResponse = await uploadOnCloudinary(thumbnailLocalPath);
  if (!thumbnailResponse) {
    throw new ApiError(400, "Error while uploadin thumbnai on cloudinary");
  }

  const thumbnailPublicId = oldvideo.thumbnail.public_id;
  const deleteThumbnail = await deleteFromCloudinary(
    thumbnailPublicId,
    "image"
  );
  if (!deleteThumbnail) {
    throw new ApiError(400, "Error while deleting file from cloudinary");
  }

  const response = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title: title,
        description: description,
        thumbnail: {
          url: thumbnailResponse.url,
          secure_url: thumbnailResponse.secure_url,
          public_id: thumbnailResponse.public_id,
        },
      },
      $inc: {
        views: 1,
      },
    },
    {
      new: true,
    }
  );
  if (!response) {
    throw new ApiError(400, "error while updating video");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, response, "video details updated successfully"));
});

// --------------video video ----------------
const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const oldVideo = await Video.findById(videoId);
  if (!oldVideo) {
    throw new ApiError(401, "Video not found");
  }

  const videoPublicId = oldVideo?.videoFile.public_id;
  const thumbnailPublicId = oldVideo?.thumbnail.public_id;

  if (!videoPublicId || !thumbnailPublicId) {
    throw new ApiError(
      400,
      "missing videoFile and thumbnail both are required"
    );
  }

  const deletingVideoFromCloudinary = await deleteFromCloudinary(
    videoPublicId,
    "video"
  );
  const deletingthumbnailFromCloudinary = await deleteFromCloudinary(
    thumbnailPublicId,
    "image"
  );

  if (!deletingVideoFromCloudinary || !deletingthumbnailFromCloudinary) {
    throw new ApiError(400, "error while deleting files from cloudinary");
  }

  const response = await Video.findByIdAndDelete(videoId);
  if (!response) {
    throw new ApiError(400, "Error while deleting video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, response, "Video file deleted successfully"));
});

// --------------togglepublish video ----------------
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  console.log("videoId : ", videoId);

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid vedio id");
  }
  const isVideoExist = await Video.findById(videoId);

  console.log("isVideoExist : ", isVideoExist);

  if (!isVideoExist) {
    throw new ApiError(401, "Video not found");
  }
  console.log("video : ", isVideoExist);

  isVideoExist.isPublished = !isVideoExist.isPublished;

  const updateVideo = await isVideoExist.save({ validateBeforeSave: true });
  if (!updateVideo) {
    throw new ApiError(400, "error while publish updating video");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updateVideo, "Publish state toggle successfully")
    );
});

export {
  publishVideo,
  getVideoById,
  getAllVideos,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
