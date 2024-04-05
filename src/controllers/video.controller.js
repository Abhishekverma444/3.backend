import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary, getVideoViews} from "../utils/cloudinary.js"


const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video

    if(
        [title, description].some((field) => 
            field?.trim() === "")
    ) {
        throw new ApiError(400,"title and description, both are required")
    }

    const videoLocalPath = req.files?.videoFile[0]?.path;
    if(!videoLocalPath){
        throw new ApiError(400, "Video is required")
    }

    let thumbnailLocalPath;
    if(req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail > 0) {
        thumbnailLocalPath = req.files.thumbnail[0].path
    }

    const video = await uploadOnCloudinary(videoLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    console.log(video)
    if(!video){
        throw new ApiError(400, "Video file is required")
    }

    console.log(await getVideoViews(video.public_id));
    
    // const createdVideo = await Video.create({
    //     videoFile: video.url,
    //     thumbnail: thumbnail.url || "",
    //     title,
    //     description,
    //     duration: video.duration,
    //     views: {
    //         type: Number,
    //         default: 0
    //     }

    // })
    // return 
})

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const video = await Video.findById(videoId)

    if(!video){ 
        throw new ApiError(400, "Invalid videoId, Can't check PublishStatus")
    }

    const PublishStatus = await Video.updateOne(
        videoId,
        {
            $set:{
                isPublished: !video.isPublished
            }
        },
        {
            new: true
        }
    )
    if(! PublishStatus){ 
        throw new ApiError(400, "PublishStatus not changed , try again")
    }
    return res.status(200).json( new ApiResponse(200, "PublishStatus changed successfully"))
    
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}