import mongoose, { isValidObjectId , ObjectId, Schema} from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const { content } = req.body;
    if (content === "") {
        throw new ApiError(400, "content is needed to createTweet")
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user?._id
    })

    if (!tweet) {
        throw new ApiError(200, "Something went wrong, during creating Tweet");
    }

    return res.status(200).json(new ApiResponse(200, tweet, "tweet is created successfully"));
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const { userId } = req.params;
    const userTweets = await User.aggregate([
        {
          $match: {
            // _id: new mongoose.Types.ObjectId(`${userId}`),
            _id: new mongoose.Types.ObjectId(userId),
          },
        },
        {
          $lookup: {
            from: "tweets",
            localField: "_id",
            foreignField: "owner",
            as: "userTweets",
          },
        },
        {
          $unwind: "$userTweets",
        },
        {
          $project: {
            username: 1,
            tweet: "$userTweets.content",
            email: 1,
            avatar: 1,
          },
        },
      ])

    if (userTweets.length === 0) {
        throw new ApiError(400, "userId is Invalid OR no tweet created by this user");
    }


    console.log(userTweets)

    return res.status(200).json(new ApiResponse(200, userTweets, "User's tweet fetched successfully"))
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId} = req.params;

    const tweetToUpdate = await Tweet.findById(tweetId)
    if (!tweetToUpdate) {
        throw new ApiError(400, "TweetId is not correct");
    }

    const { content } = req.body;
    if(content.trim() === ""){
        throw new ApiError(400, "Con't update by Providing empty value")
    }
    const newTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content: content || tweetToUpdate.content,
            }
        },
        {
            new: true // to return updated document
        }
    )

    if(!newTweet){
        throw new ApiError(400, "Something went wrong, during tweet updation")
    }

    return res.status(200).json( 
        new ApiResponse(200, "Tweet is updated Successfully!")
    )
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params;

    const deleteTweet = await Tweet.findByIdAndDelete(tweetId);
    console.log(deleteTweet)
    if(!deleteTweet){
        throw new ApiError(404, "Tweet is not found to delete");
    }

    return res.status(200).json(new ApiResponse(200,"Tweet is deleted successfully"));
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}