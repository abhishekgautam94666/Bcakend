import { Router } from "express";
import { loginUser, logoutUser, refreshAccessToken, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.js";
import { verifyJwt } from "../middlewares/Auth.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avtar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJwt,logoutUser)

router.route("/refresh-token").post(refreshAccessToken)

export default router;