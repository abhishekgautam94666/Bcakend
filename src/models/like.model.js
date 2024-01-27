import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
  {
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
    },
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      required: "Comment",
    },
    tweet: {
      type: mongoose.Schema.Types.ObjectId,
      required: "Tweet",
    },
    likedBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: "User",
    },
  },
  { timestamps: true }
);

export const Like = mongoose.model("Like", likeSchema);
