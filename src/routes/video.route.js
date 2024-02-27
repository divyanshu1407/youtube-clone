import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { PublishVideo } from "../controllers/video.controller.js";

const router = Router()

router.route("/").post(verifyJWT, 
    upload.fields([
        {
            name: "video",
            maxCount: 1
        },
        {
            name: "thumbnail",
            maxCount: 1
        }
    ]), PublishVideo)

export default router