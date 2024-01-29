import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { isValidObjectId } from "mongoose";

// ---------- publishVideo ------------
const publishVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!title || !description) {
    throw new ApiError(401, "All fields are required");
  }
   
  console.log(req.files);

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
    res
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
// const getVideoById = asyncHandler(async (req, res) => {
//   const { videoId } = req.params;

//   if (!isValidObjectId(videoId)) {
//     throw new ApiError(400, "Invalid video id");
//   }

//   const isVideoExist = await Video.findById(videoId);

//   if (!isVideoExist) {
//     throw new ApiError(404, "Video not found");
//   }
// });
