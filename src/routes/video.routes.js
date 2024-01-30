import { Router } from "express";
import { verifyJwt } from "../middlewares/Auth.js";
import { upload } from "../middlewares/multer.js";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishVideo,
  togglePublishStatus,
  updateVideo,
} from "../controllers/video.controller.js";

const router = Router();
router.use(verifyJwt);

router.route("/getAllVideos").get(getAllVideos);

router.route("/publish").post(
  upload.fields([
    {
      name: "videoFile",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  publishVideo
);

router
  .route("/:videoId")
  .get(getVideoById)
  .patch(upload.single("thumbnail"), updateVideo)
  .delete(deleteVideo);

router.route("/togglePublish/:videoId").get(togglePublishStatus);
export default router;
