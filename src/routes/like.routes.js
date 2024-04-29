import { Router } from 'express';
import { 
    getLikedVideos,
    toggleCommentLike,
    toggleVideoLike,
    toggleTweetLike,
    toggleVideoDislike,
    getVideoLikesAndDislikes
} from '../controllers/like.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
 
const router = Router();

router.use(verifyJWT); 

router.route("/toggle/v/like/:videoId").post(toggleVideoLike);
router.route("/toggle/v/dislike/:videoId").post(toggleVideoDislike);
router.route("/toggle/c/:commentId").post(toggleCommentLike);
router.route("/toggle/t/:tweetId").post(toggleTweetLike);
router.route("/videos").get(getLikedVideos);
router.route("/video/likes-dislikes/:videoId").get(getVideoLikesAndDislikes);

export default router;
 