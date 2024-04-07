import { Router } from "express"
import {
    getSubscribedChannels,
    getUserChannelSubscribers,
    toggleSubscription,
} from '../controllers/subscription.controller.js'
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router();
router.use(verifyJWT); 


router
    .route("/c/:channelId")
    .get(getUserChannelSubscribers) // Endpoint to get subscribers for a channel
    .post(toggleSubscription);      // Endpoint to toggle subscription for a channel

router
    .route("/u/:subscriberId")
    .get(getSubscribedChannels);    // Endpoint to get channels subscribed by a user


export default router;
