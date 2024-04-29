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
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

    let matchStage = {};
    let sortStage = {};
 

    // Handle filtering based on userId
    if (userId) {
        const videos = await Video.aggregate([
            { $match: { owner: mongoose.Types.ObjectId(userId) } },
            { $skip: (page - 1) * parseInt(limit) }, // Pagination: Skip documents
            { $limit: parseInt(limit) } // Pagination: Limit documents
        ]);
        if (!videos || videos.length === 0) {
            throw new ApiError(400, "No videos found for this user.");
        }
        return res.status(200).json(new ApiResponse(200, videos, "Videos fetched successfully."));
    }

    // Handle general video search with optional query
    if (!query || query.trim() === '') {
        matchStage = {}; // Match all videos
    } else {
        const searchWords = query.split(" ");
        const regexPattern = searchWords.map(word => `(?=.*${word})`).join('');
        matchStage.title = { $regex: regexPattern, $options: 'i' };
    }

    // Handle sorting based on sortBy
    if (sortBy) {
        if (sortBy === "ascDate") {
            sortStage.createdAt = 1;
        } else if (sortBy === "ascViews") {
            sortStage.views = 1;
        } else if (sortBy === 'descViews') {
            sortStage.views = -1;
        } else if (sortBy === 'ascDur') {
            sortStage.duration = 1;
        } else if (sortBy === 'descDur') {
            sortStage.duration = -1;
        } else {
            sortStage.createdAt = -1; // Default sorting by creation date descending
        }
    } else {
        sortStage.createdAt = -1; // Default sorting by creation date descending
    }

  


    let result = [];

    // Handle video results based on sortType
    if (sortType === "all" || sortType === "video") {
        const videos = await Video.aggregate([
            { $match: matchStage },
            { $sort: sortStage },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner_details"
                }
            },
            {
                $addFields: {
                    owner_details: { $arrayElemAt: ["$owner_details", 0] }
                }
            },
            {
                $project: {
                    thumbnail: 1,
                    title: 1,
                    views: 1,
                    createdAt: 1,
                    channelImage: "$owner_details.avatar",
                    channelName: "$owner_details.fullname",
                    description: 1,
                    isPublished: true,
                    updatedAt: 1,
                    videoFile: 1,
                    duration: 1,
                    owner: 1
                }
            },
            { $skip: (page - 1) * parseInt(limit) }, // Pagination: Skip documents
            { $limit: parseInt(limit) } // Pagination: Limit documents
        ]);

        if(sortType === 'video'){
            result.push({'videos': videos})
            return res.status(200).json(new ApiResponse(200, result, "Videos fetched successfully."));
        }
        result.push({'videos': videos})
    }


    const playlistMatchExpression = Object.keys(matchStage).length > 0 ? { name: { $regex: matchStage.title.$regex, $options: 'i' } } : matchStage;
    if (sortType === "playlist" || sortType === "all") {
        const playlists = await Playlist.aggregate([
            { $match: playlistMatchExpression },
            { $sort: { createdAt: -1 } },
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) }
        ]);

        if(sortType === 'playlist'){
            result.push({'playlists': playlists})
            return res.status(200).json(new ApiResponse(200, result, "Playlists fetched successfully."));
        }
        result.push({'playlists': playlists})
    }

    const channelMatchExpression = Object.keys(matchStage).length > 0 ? { username: { $regex: matchStage.title.$regex, $options: 'i' } } : matchStage;
    if (sortType === "channel" || sortType === "all") {
        const channels = await User.aggregate([
            { $match: channelMatchExpression },
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
                    subscribersCount: { $size: "$subscribers" },
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
                    avatar: 1
                }
            },
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) }
        ]);

        if(sortType === 'channel'){
            result.push({'channels': channels});
            return res.status(200).json(new ApiResponse(200, result, "Channels fetched successfully."));
        }
        result.push({'channels': channels});
    }

    return res.status(200).json(new ApiResponse(200, result, "All Data fetched successfully."));
});

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