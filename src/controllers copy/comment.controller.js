import mongoose, { isValidObjectId } from "mongoose"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from '../utils/ApiResponse.js'
import { Comment } from "../models/comment.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query; // for pagination

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Video id is invalid");
    }

    const pipeline = [
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $addFields: {
                owner: { $first: "$owner" }
            }
        },
        {
            $project: {
                username: "$owner.username",
                avatar: "$owner.avatar",
                content: 1,
            }
        },
        { $skip: (page - 1) * limit }, // Pagination: Skip documents
        { $limit: parseInt(limit) } // Pagination: Limit documents
    ];

    const comments = await Comment.aggregate(pipeline);

    return res.status(200).json(new ApiResponse(200, comments, "Video comments retrieved successfully."));
});

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { videoId } = req.params;
    const { content } = req.body;
    const user = req.user?._id;

    if (content.trim() === "") {
        throw new ApiError(400, "Comment cannot be empty.");
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Video id is invalid");
    }

    const commentAdded = await Comment.create({
        content,
        video: videoId,
        owner: user,
    });

    if (!commentAdded) {
        throw new ApiError(400, "Failed to add this comment")
    }

    return res.status(200).json(new ApiResponse(200, commentAdded, "Comment added successfully."));
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params;
    const { content } = req.body;

    if (content.trim() === "") {
        throw new ApiError(400, "Comment can't be empty!");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(400, "Comment id is invalid!");
    }
    if (comment.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Unauthorized request, User not matched.");
    }

    const newComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content,
            }
        },
        {
            new: true
        }
    )

    if (!newComment) {
        throw new ApiError(400, "Failed to update the comment.");
    }

    return res.status(200).json(new ApiResponse(200, newComment, "Comment updated successfully."));
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(400, "Comment id is invalid!");
    }
    if (comment.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Unauthorized request, User not matched.");
    }

    const deletedComment = await Comment.findByIdAndDelete(commentId);

    if (!deletedComment) {
        throw new ApiError(400, "Failed to Delete the comment.");
    }

    return res.status(200).json(new ApiResponse(200, deletedComment, "Comment deleted successfully."));
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}