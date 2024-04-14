import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { response } from "express"

const getChannelStatus = asyncHandler(async (req, res) => {
    // TODO: Get the channel status like total video views, total subscribers, total videos, total likes etc.
    const user = req.user?._id;
    const totalSubscriberes = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(user)
            },

        },
        {
            $group: {
                _id: null,
                subscribers: {
                    $sum: 1
                }
            }
        }
    ])
    const totalViewsAndVideos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(user)
            }
        },
        {
            $group: {
                _id: null,
                totalvideos: {
                    $sum: 1,
                },
                totalviews: {
                    $sum: "$views"
                },
            }
        }
    ])
    const totalLikes = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(user),
            },

        },
        {
            $lookup: {
                from: 'likes',
                localField: '_id',
                foreignField: 'video',
                as: 'likes'
            }
        },
        {
            $unwind: '$likes'
        },
        {
            $count: "likes"
        }
    ])

    const response  = {
        views: totalSubscriberes[0].subscribers || 0,
        videos: totalViewsAndVideos[0].totalvideos,
        subscriberes: totalViewsAndVideos[0].totalviews,
        likes: totalLikes[0].likes,
    }

    return res.status(200).json(new ApiResponse(200, response, "Total suvscribers."))
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const videos = await Video.aggregate([
        {
            $match:{
                owner: new mongoose.Types.ObjectId(req.user?._id),
            }
        }
    ])

    if(!videos){
        throw new ApiError(400, "Failed to get videos of this channel.");
    }

    return res.status(200).json(new ApiResponse(200, videos, "Channel's videos fetched successfully."));
})

export {
    getChannelStatus,
    getChannelVideos
}