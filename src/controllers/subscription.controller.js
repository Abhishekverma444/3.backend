import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params // it is also a userId to which another user wants to subscribe
    // TODO: toggle subscription 

    const user = req.user?._id

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, 'Invalid channelId');
    }

    const existingUser = await User.findById(channelId);
    if (!existingUser) {
        throw new ApiError(404, 'Channel not found');
    }

    const subscription = await Subscription.findOne({
        subscriber: user,
        channel: channelId
    })

    if (subscription) {
        await Subscription.deleteOne({ _id: subscription._id });
        return res.status(200).json(new ApiResponse(200, false,"Unsubscribed successfully"));
    } else {
        await Subscription.create({ subscriber: user, channel: channelId })
        return res.status(200).json(new ApiResponse(200, true,"Subscribed successfully"))
    }
})

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    // controller to return subscriber list of a channel
    const { channelId } = req.params

    console.log(channelId)

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channelId");
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber_details"
            }
        },
        {
            $addFields: {
                subscriber_details: {
                    $first: "$subscriber_details"
                }
            }
        },
        {
            $project: {
                name: "$subscriber_details.fullname",
                email: "$subscriber_details.email",
                username: "$subscriber_details.username",
                avatar: "$subscriber_details.avatar",
            }
        }
    ])

    console.log(subscribers)

    if (!subscribers?.length) {
        return res.status(200).json(new ApiResponse(200, "", "you have no subscriber"))
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, subscribers, "subscribers fetched successfully")
        );
})

const getSubscribedChannels = asyncHandler(async (req, res) => {
    // controller to return channel list to which user has subscribed
    const { subscriberId } = req.params     // this channelId is actually a subscriberId through which we are matching

    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid channelId");
    }

    const channels = await Subscription.aggregate([
        {
            $match: {
                // subscriber: new mongoose.Types.ObjectId(`${subscriberId}`)
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel_details"
            }
        },
        {
            $addFields: {
                channel_details: {
                    $first: "$channel_details"
                }
            }
        },
        {
            $project: {
                name: "$channel_details.fullname",
                email: "$channel_details.email",
                username: "$channel_details.username",
                avatar: "$channel_details.avatar",
                _id: "$channel_details._id"
            }
        }
    ])

    console.log(channels)

    if (!channels?.length) {
        return res.status(200).json(new ApiResponse(200, "", "you have not subscribed any channel yet"))
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, channels, "channels fetched successfully")
        );
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}