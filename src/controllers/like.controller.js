import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { Dislike } from "../models/dislike.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const user = req.user?._id;
    //TODO: toggle like on video
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Video id is invalid");
    }

    const videoLike = await Like.findOne({ video: videoId, likedBy: user }); // return null if condition goes false
    const videoDislike = await Dislike.findOne({ video: videoId, dislikedBy: user });

    if (videoLike) {
        await Like.deleteOne({ video: videoId, likedBy: user })
        return res.status(200).json(new ApiResponse(200, false, "Video like status is removed"));
    } else {
        if (videoDislike) {
            await Dislike.deleteOne({ video: videoId, dislikedBy: user })
            await Like.create({ video: videoId, likedBy: user });
            return res.status(200).json(new ApiResponse(200, true, "You liked this video."));
        } else {
            await Like.create({ video: videoId, likedBy: user });
            return res.status(200).json(new ApiResponse(200, true, "You liked this video."));
        }
    }
})

const toggleVideoDislike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const user = req.user?._id;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Video id is invalid");
    }

    const videoDislike = await Dislike.findOne({ video: videoId, dislikedBy: user });
    const videoLike = await Like.findOne({ video: videoId, likedBy: user });

    if (videoDislike) {
        await Dislike.deleteOne({ video: videoId, dislikedBy: user })
        return res.status(200).json(new ApiResponse(200, false, "Video dislike status is removed"));
    } else {
        if (videoLike) {
            await Like.deleteOne({ video: videoId, likedBy: user })
            await Dislike.create({ video: videoId, dislikedBy: user });
            return res.status(200).json(new ApiResponse(200, true, "You disliked this video."));
        } else {
            await Dislike.create({ video: videoId, dislikedBy: user });
            return res.status(200).json(new ApiResponse(200, true, "You disliked this video."));
        }
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    const user = req.user?._id;
    //TODO: toggle like on comment

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Comment id is invalid");
    }

    const commentLike = await Like.findOne({ comment: commentId, likedBy: user });

    if (commentLike) {
        await Like.deleteOne({ comment: commentId, likedBy: user })
        return res.status(200).json(new ApiResponse(200, false, "Comment like status is removed"));
    } else {
        await Like.create({ comment: commentId, likedBy: user });
        return res.status(200).json(new ApiResponse(200, true, "You liked this Comment."));
    }
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const user = req.user?._id;
    //TODO: toggle like on tweet

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Tweet id is invalid");
    }

    const tweetLike = await Like.findOne({ tweet: tweetId });

    if (tweetLike) {
        await Like.deleteOne({ tweet: tweetId, likedBy: user });
        return res.status(200).json(new ApiResponse(200, false, "Tweet like status is removed"));
    } else {
        await Like.create({ tweet: tweetId, likedBy: user });
        return res.status(200).json(new ApiResponse(200, true, "You liked this Tweet."));
    }
});

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video_details"
            }
        },
        {
            $addFields: {
                video_details: {
                    $first: "$video_details"
                }
            }
        },
        {
            $project: {
                videoFile: "$video_details.videoFile",
                thumbnail: "$video_details.thumbnail",
                title: "$video_details.title",
                video_id: "$video_details._id"
            }
        }
    ])

    if (likedVideos.length === 0) {
        throw new ApiError(400, "No liked videos found!");
    }

    return res.status(200).json(new ApiResponse(200, likedVideos, "Liked videos list"));
})

const getVideoLikesAndDislikes = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const user = req.user?._id;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Video id is invalid");
    }

    const result = []
    const videoDislikes = await Dislike.aggregate([
        {
            $match: { video: new mongoose.Types.ObjectId(videoId) },
        },
    ])
    const videoLikes = await Like.aggregate([
        {
            $match: { video: new mongoose.Types.ObjectId(videoId) }
        }
    ])
    result.push({ likes: videoLikes })
    result.push({ dislikes: videoDislikes })
    return res.status(200).json(new ApiResponse(200, result, 'You fetched video likes dislikes successfully'))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos,
    toggleVideoDislike,
    getVideoLikesAndDislikes
}