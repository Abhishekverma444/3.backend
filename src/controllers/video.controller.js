import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { Playlist } from '../models/playlist.model.js'
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { deleteCloudinaryImage, uploadOnCloudinary, deleteCloudinaryVideo } from "../utils/cloudinary.js"


const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    // TODO: get video, upload to cloudinary, create video

    if (
        [title, description].some((field) =>
            field?.trim() === "")
    ) {
        throw new ApiError(400, "title and description, both are required")
    }

    const videoLocalPath = req.files?.videoFile[0]?.path;
    console.log(videoLocalPath);
    if (!videoLocalPath) {
        throw new ApiError(400, "Video is required")
    }

    let thumbnailLocalPath;
    if (req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0) {
        thumbnailLocalPath = req.files?.thumbnail[0].path
    }

    const video = await uploadOnCloudinary(videoLocalPath, 'video');
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    console.log(video.url)
    console.log(thumbnail.url)
    console.log(video.duration)

    if (!video) {
        throw new ApiError(400, "Video file is required")
    }

    const createdVideo = await Video.create({
        videoFile: video?.url,
        thumbnail: thumbnail?.url || "",
        title,
        description,
        duration: video?.duration,
        owner: req.user?._id,
    })

    if (!createdVideo) {
        throw new ApiError(400, "Something went wrong to publish video");
    }

    return res.status(200).json(
        new ApiResponse(200, createdVideo, "Video published successfully")
    )
})

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    // sortBy: upload_date, view count, duration
    // sortType: all, video, channel, playlist

    if(userId){
        const videos = await Video.aggregate([
            { $match:{ owner: new mongoose.Types.ObjectId(userId)} }
        ])
        if(!videos){
            throw new ApiError(400, "Failed to get the videos Or no video uploaded by this user.");
        }
        return res.status(200).json(new ApiResponse(200, videos, "Videos fetched successfully."));
    }


    let matchStage = {};
    let searchWords;
    let regexPattern;
    if (typeof query === "string") {
        searchWords = query.split(" "); // Split the search string into individual words
        regexPattern = searchWords.map(word => `(?=.*${word})`).join('');// Construct the regular expression pattern to match any of the words
        matchStage.title = { $regex: regexPattern, $options: 'i' };
    }

    const sortStage = {};
    if (sortBy) {
        if (sortBy === "ascDate") {
            sortStage.createdAt = 1;
        }
        else if (sortBy === "ascViews") {
            sortStage.views = 1;
        }
        else if (sortBy === 'descViews') {
            sortStage.views = -1;
        }
        else if (sortBy === 'ascDur') {
            sortStage.duration = 1;
        }
        else if (sortBy === 'descDur') {
            sortStage.duration = -1;
        }
        else {
            sortStage.createdAt = -1;
        }
    }


    let resResult;
    if (sortType === "all" || sortType === "video") {
        resResult = await Video.aggregate([
            {
                $match: matchStage,
            },
            {
                $sort: sortStage,
            },
            { $skip: (page - 1) * limit }, // Pagination: Skip documents
            { $limit: parseInt(limit) } // Pagination: Limit documents
        ])

        if (sortType === "video") {
            return res.status(200).json(new ApiResponse(200, resResult, "Videos found successfully."));
        }
    }

    if(sortType === "playlist" || sortType === "all"){
        const playlists = await Playlist.aggregate([
            {
                $match: {
                    name: { $regex: regexPattern, $options: 'i' },
                },
            },
            {
                $sort: {
                    createdAt: -1,
                },
            },
            { $skip: (page - 1) * limit }, // Pagination: Skip documents
            { $limit: parseInt(limit) } // Pagination: Limit documents
        ])
        if(sortType === "playlist"){
            resResult = playlists;
        } else {
            resResult.push({playlists: playlists})
        }
    }

    if(sortType === "channel" || sortType === "all"){
        const channels = await User.aggregate([
            {
               $match: {
                  username: { $regex: regexPattern, $options: 'i' }
               }
            },
            {
               $lookup: {
                  from: "subscriptions",
                  localField: "_id",
                  foreignField: "channel",
                  as: "subscribers"
               }
            },
            {
               $addFields: {
                  subscribersCount: {
                     $size: "$subscribers"
                  },
                  isSubscribed: {
                     $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                     }
                  }
               }
            },
            {
               $project: {
                  fullname: 1,
                  username: 1,
                  subscribersCount: 1,
                  isSubscribed: 1,
                  avatar: 1,
               }
            },
            { $skip: (page - 1) * limit }, // Pagination: Skip documents
            { $limit: parseInt(limit) } // Pagination: Limit documents
         ])
        if(sortType === "channels"){
            resResult = channels;
        } else {
            resResult.push({channels: channels})
        }
    }


    if (resResult.length === 0) {
        throw new ApiError(400, "Video not found.");
    }

    return res.status(200).json(new ApiResponse(200, resResult, "Videos found successfully."));
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(400, "Invalid videoId")
    }

    return res.status(200).json(new ApiResponse(200, video, "video found successfully"));
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

    const videoToUpdate = await Video.findById(videoId)

    if (!videoToUpdate) {
        throw new ApiError(400, "videoId is Invalid");
    }

    if (videoToUpdate.owner.toString() !== req.user?._id.toString()) { // convert both to string because both are the instance of _id
        throw new ApiError(400, "Can't update this video, Owner is not same");
    }

    const { title, description } = req.body;
    if (title.trim() === '') {
        throw new ApiError(400, "Title is needed to update")
    }

    const thumbnailLocalPath = await req.file?.path;
    let newThumbnail;
    if (thumbnailLocalPath) {
        newThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        await deleteCloudinaryImage(videoToUpdate.thumbnail);
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                thumbnail: newThumbnail.url || videoToUpdate.thumbnail,
                title: title || videoToUpdate.title,
                description: description || videoToUpdate.description,
            }
        }
    )

    if (!updatedVideo) {
        throw new ApiError(400, "Something went wrong, during updating the video")
    }

    return res.status(200).json(new ApiResponse(200, "Video updated successfully"));
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(400, "Invalid videoId");
    }

    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Can't delete this video, Owener is Invalid");
    }

    let thumbnailToDelete;
    if (video.thumbnail !== "") {
        thumbnailToDelete = await deleteCloudinaryImage(video.thumbnail);
        if (!thumbnailToDelete) {
            throw new ApiError(400, "thumbnail not deleted");
        }
    }

    const videoToDelete = await deleteCloudinaryVideo(video.videoFile);
    if (!videoToDelete) {
        throw new ApiError(400, "Video file is not deleted");
    }

    const videoDeleted = await Video.deleteOne({ _id: videoId })

    if (videoDeleted.deletedCount === 0) {
        throw new ApiError(404, "Something went wrong, to delete video")
    }

    return res.status(200).json(new ApiResponse(200, "Video deleted successfully"));
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(400, "Invalid videoId, Can't check PublishStatus")
    }

    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Can't perform this action, video owner is not same");
    }

    const newStatus = !video.isPublished

    const PublishStatus = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: newStatus
            }
        },
        {
            new: true
        }
    )
    if (!PublishStatus) {
        throw new ApiError(400, "PublishStatus not changed , try again")
    }
    return res.status(200).json(new ApiResponse(200, newStatus, "PublishStatus changed successfully"))

})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}