import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getSubscribedChannels, getUserChannelSubscribers, toggleSubscription } from "../controllers/subscription.controller.js";



const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router
    .route("/c/:channelName")
    .get(getSubscribedChannels)
    .post(toggleSubscription);

router.route("/u/:subscriberId").get(getUserChannelSubscribers);

export default router