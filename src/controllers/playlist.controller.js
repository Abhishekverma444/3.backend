import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    let {name, description} = req.body
    //TODO: create playlist 
    if(name === ""){
        throw new ApiError(400, "Playlist name is required")
    }

    if(!description){
        description = 'Please add a description'
    }

    const playlistCreated = await Playlist.create({
        name,
        description,
        owner: req.user?._id,
    })

    if(!playlistCreated){
        throw new ApiError(400, "An error occurred while creating the playlist.");
    }

    return res.status(200).json(new ApiResponse(200, playlistCreated, "You have successfully created a playlist."));
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    if(!isValidObjectId(userId)){
        throw new ApiError(400, "Invalid userId, can't get the playlist")
    }

    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        }
    ])

    if (!playlists?.length) {
        return res.status(200).json(new ApiResponse(200, "", "You have not created any palylist yet"))
    }

    return res.status(200).json(new ApiResponse(200, playlists, "Your playlists"));
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlistId, can't get the playlist")
    }

    const playlist = await Playlist.findById(playlistId);

    if(!playlist){
        throw new ApiError( 400 , "Something went wrong while getting your playlist")
    }

    return res.status(200).json(new ApiResponse(200, playlist, "Playlist fetched successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new ApiError(400, "Playlist or Video ID is Invalid!");
    }

    const videoAdded = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $push: {
                videos: videoId,
            }
        }, 
        {
            new: true,
        }
    )

    if (!videoAdded) {
        throw new ApiError(404, "Playlist not found, video could not be added");
    }

    return res.status(200).json(new ApiResponse(200, videoAdded,"Video added to playlist successfully"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new ApiError(400, "Playlist or Video ID is Invalid!");
    }

    const isVideoPresent = await Playlist.findOne({_id: playlistId, videos: videoId})
    if(!isVideoPresent){
        throw new ApiError(400, "Video not found!");
    }

    const removeVideo = await Playlist.findByIdAndUpdate(
        playlistId,
        { $pull: { videos: videoId } },
        { new: true } 
    );

    if(!removeVideo){
        throw new ApiError(404, "Playlist or Video not found to remove!");
    }

    return res.status(200).json(new ApiResponse(200, removeVideo, "Video removed successfully"))
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Playlist id is invalid!");
    }
    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId) // return null when not found

    if(!deletedPlaylist){
        throw new ApiError(400, "Failed to delete the playlist.");
    }

    return res.status(200).json(new ApiResponse(200, deletedPlaylist, "Playlist deleted successfully."))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, 'Playlist id is invalid!');
    }

    if([name, description].some((field) => field.trim() === "")){
        throw new ApiError("Name or description cannot be empty.");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name,
                description, 
            }
        },
        {
            new: true // to return the updated document
        }
    )

    if(!updatedPlaylist){
        throw new ApiError(400, "Failed to update the playlist. Playlist may not exist or no changes were made.")
    }
 
    return res.status(200).json(new ApiResponse(200, updatedPlaylist, "Playlist updated successfully."));
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}