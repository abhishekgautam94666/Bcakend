import { Router } from "express";
import { verifyJwt } from "../middlewares/Auth.js";
import { upload } from "../middlewares/multer.js";
import { getVideoById, publishVideo } from "../controllers/video.controller.js";

const router = Router();

router.use(verifyJwt);

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

router.route("/:videoId").get(getVideoById);

export default router;
