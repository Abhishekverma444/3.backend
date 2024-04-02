import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"


export const verifyJWT = asyncHandler(async(req,_,next)=>{

    // req-> token from client using both mobile and web scenario and if not found then throw error
    // decodeToken using jwt's method and remove password and refreshToken field from this user instance
    // find user using decoded token, if not find then throw error
    // add user in `req` and call the next


    try {

        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    
        if( !token) {
            throw new ApiError(401, "Unauthorized request")
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if (!user) {
            // NEXT_VIDEO: discuss about frontend
            throw new ApiError(401, "Invalid Access Token")
        }
        
        req.user = user;
        next()

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid accessToken")
    }

})