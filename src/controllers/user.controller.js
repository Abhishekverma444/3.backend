import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary, deleteCloudinaryImage } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const generateAccessAndRefreshTokens = async (userId) => {
   try {
      const user = await User.findById(userId)
      const accessToken = user.generateAccessToken()
      const refreshToken = user.generateRefreshToken()

      user.refreshToken = refreshToken
      await user.save({ validateBeforeSave: false }) // Save the user object without performing validation to optimize performance.

      return { accessToken, refreshToken }

   } catch (error) {
      throw new ApiError(500, "Something went wrong while generating refresh and access token")
   }
}

const registerUser = asyncHandler(async (req, res) => {
   // get user details from frontend
   // validation - not empty
   // check if user already exists: username, email
   // check for images, check for avatar
   // upload then to cloudinary, avatar
   // create user object - create entry in db
   // remove password and refresh token field from response
   // check for user creation
   // return response

   const { fullname, email, username, password } = req.body
   // console.log('email: ', email);
   console.log("req.body", req.body);


   if (
      [fullname, email, username, password].some((field) =>
         field?.trim() === "") // agar ek bhi field empty hai to wo true return karega
   ) {
      throw new ApiError(400, "All fields are required")
   }

   const existedUser = await User.findOne({
      $or: [{ username }, { email }]
   })

   if (existedUser) {
      throw new ApiError(409, "User with email or username already exists")
   }

   console.log("req.files :- ", req.files);

   const avatarLocalPath = req.files?.avatar[0]?.path
   //    const coverImageLocalPath = req.files?.coverImage[0]?.path;

   let coverImageLocalPath;
   if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
      coverImageLocalPath = req.files.coverImage[0].path;
   }

   if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar file is required")
   }

   const avatar = await uploadOnCloudinary(avatarLocalPath)
   const coverImage = await uploadOnCloudinary(coverImageLocalPath) // agar yahan coverImage nhi mil rahi hai to cloudinary ek empty string send kar deta hai

   if (!avatar) {
      throw new ApiError(400, "Avatar file is required")
   }

   const user = await User.create({
      fullname,
      avatar: avatar?.url,
      coverImage: coverImage?.url || "",
      email,
      password,
      username: username.toLowerCase()
   })

   const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
   )

   if (!createdUser) {
      throw new ApiError(500, "Something went wrong while registering the user")
   }

   return res.status(201).json(
      new ApiResponse(200, createdUser, " User registered successfully ")
   )

})

const loginUser = asyncHandler(async (req, res) => {
   // req.body -> data
   // username or email 
   // find the user and error if not found
   // password check
   // access and refresh token
   // remove (-password -refreshToken) from res->loggedInUser
   // send cookie

   const { email, username, password } = req.body;

   if (!(username || email)) {
      throw new ApiError(400, "username or email is required")
   }

   const user = await User.findOne({ // .findOne() if not found then it return `null`
      $or: [{ username }, { email }] // username ya email jo bhi hai usi se find kar lo
   })

   if (!user) {
      throw new ApiError(404, "User does not exist")
   }

   // User- ye user to mongodb ka hai 
   // user - ye user jiska instance aapne batabase se liya hia , iske paas un methods ka access hai , jise aapne banaya hai
   const isPasswordValid = await user.isPasswordCorrect(password)

   if (!isPasswordValid) {
      throw new ApiError(401, "Invalid user credentials")
   }

   const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

   const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

   const options = { // ye karne par cookie sirf server se modify ki ja sakti hai 

      httpOnly: true,  // Set 'httpOnly' to 'true' to prevent client-side access to the cookie, enhancing security by mitigating cross-site scripting (XSS) attacks.

      secure: true,  //  Set 'secure' to 'true' to ensure the cookie is only transmitted over HTTPS connections, improving security by encrypting data during transmission and preventing interception.
   }

   return res
      .status(200)
      .cookie("accessToken", accessToken, options) // cookie("name", "value", "options")
      .cookie("refreshToken", refreshToken, options)
      .json(
         new ApiResponse(
            200,
            {
               user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
         )
      )

})

const logoutUser = asyncHandler(async (req, res) => {
   User.findByIdAndUpdate(
      req.user._id,
      {
         // $set: {
         //    refreshToken: undefined
         // }
         $unset: {
            refreshToken: 1 // this removes the field form document
         }
      },
      {
         new: true // ise true karne par jo response me value milegi vo updated value milegi
      }
   )  // findByIdAndUpdate(id,{update},other)

   const options = {
      httpOnly: true,
      secure: true
   }

   return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
   const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken

   if (!incomingRefreshToken) {
      throw new ApiError(401, "unauthorized request")
   }

   try { // yahan par try-catch me likhna thoda safety kar sakta hai 
      const decodedToken = jwt.verify(
         incomingRefreshToken,
         process.env.REFRESH_TOKEN_SECRET // bina iske token decode nhi hoga
      )

      const user = await User.findById(decodedToken?._id)

      if (!user) {
         throw new ApiError(401, "Invalid refresh token")
      }

      if (incomingRefreshToken !== user?.refreshToken) {
         throw new ApiError(401, "Refresh token is expired or used")
      }

      const options = {
         httpOnly: true,
         secure: true
      }

      const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)

      return res
         .status(200)
         .cookie("accessToken", accessToken, options)
         .cookie("refreshToken", newRefreshToken, options)
         .json(
            new ApiResponse(
               200,
               { accessToken, newRefreshToken },
               "Access token refreshed"
            )
         )
   } catch (error) {
      throw new ApiError(401, error?.message || "Invalid refresh token")
   }

})

const changeCurrentPassword = asyncHandler(async (req, res) => {
   const { oldPassword, newPassword } = req.body

   const user = await User.findById(req.user?._id)
   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

   if (!isPasswordCorrect) {
      throw new ApiError(400, "Invalid old password")
   }

   user.password = newPassword
   await user.save({ validateBeforeSave: false })

   return res
      .status(200)
      .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrectUser = asyncHandler(async (req, res) => {
   return res
      .status(200)
      .json(new ApiResponse(200, req.user, "currect user fetched successfully"))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
   const { fullname, email } = req.body

   if (!fullname || !email) {
      throw new ApiError(400, "All fields are required")
   }

   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set: {
            fullname,
            email
         }
      },
      { new: true }
   ).select("-password")

   return res
      .status(200)
      .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
   const avatarLocalPath = req.file?.path // yahan files nhi likhna hai batao kyu, kyuki hum ek hi file lenge

   if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar file is missing")
   }

   // TODO: delete old image after updating - assignment
   await deleteCloudinaryImage(req.user?.avatar)

   const avatar = await uploadOnCloudinary(avatarLocalPath)

   if (!avatar.url) {
      throw new ApiError(400, "Error while uploading an avatar")
   }

   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set: {
            avatar: avatar.url
         }
      }, {
      new: true
   }
   ).select("-password ")


   return res
      .status(200)
      .json(new ApiResponse(200, user, "Avatar image updated successfully"))

})

const updateUserCoverImage = asyncHandler(async (req, res) => {
   const coverImageLocalPath = req.file?.path // yahan files nhi likhna hai batao kyu, kyuki hum ek hi file lenge

   if (!coverImageLocalPath) {
      throw new ApiError(400, "CoverImage file is missing")
   }

   const coverImage = await uploadOnCloudinary(coverImageLocalPath)

   if (!coverImage.url) {
      throw new ApiError(400, "Error while uploading an coverImage")
   }

   // TODO: delete old image after updating - assignment
   await deleteCloudinaryImage(req.user?.coverImage);

   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set: {
            coverImage: coverImage.url
         }
      }, {
      new: true
   }
   ).select("-password ")

   return res
      .status(200)
      .json(new ApiResponse(200, user, "Cover image updated successfully"))

})

const getUserChannelProfile = asyncHandler(async (req, res) => {
   const { username } = req.params

   if (!username?.trim()) {
      throw new ApiError(400, "username is missing")
   }

   const channel = await User.aggregate([
      {
         $match: {
            username: username?.toLowerCase()
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
         $lookup: {
            from: "subscriptions",
            localField: "_id",
            foreignField: "subscriber",
            as: "subscribedTo"
         }
      },
      {
         $addFields: {
            subscribersCount: {
               $size: "$subscribers"
            },
            channelsSubscribedToCount: {
               $size: "$subscribedTo"
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
            channelsSubscribedToCount: 1,
            isSubscribed: 1,
            avatar: 1,
            coverImage: 1,
            email: 1,
         }
      }
   ])

   console.log(channel);

   if (!channel?.length) {
      throw new ApiError(404, "channel does not exists")
   }

   return res
      .status(200)
      .json(
         new ApiResponse(200, channel[0], "User channel fetched successfully")
      )
})

const getWatchHistory = asyncHandler(async (req, res) => {
   const user = await User.aggregate([ // aggregate mein mongoose kam nhi karta hai, to direct _id nhi pass kari ja sakti
      {
         $match: {
            _id: new mongoose.Types.ObjectId(req.user._id)
         }
      },
      {
         $lookup: {
            from: "videos",
            localField: "watchHistory",
            foreignField: "_id",
            as: "watchHistory",
            pipeline: [
               {
                  $lookup: {
                     from: "users",
                     localField: "owner",
                     foreignField: "_id",
                     as: "owner",
                     pipeline: [
                        {
                           $project: {
                              fullname: 1,
                              username: 1,
                              avatar: 1
                           }
                        }
                     ]
                  }
               },
               {
                  $addFields: {
                     owner: {
                        $first: "$owner"
                     }
                  }
               }
            ]
         }
      }
   ])

   return res
      .status(200)
      .json(
         new ApiResponse(200, user[0].watchHistory, "Watch history fetched successfully")
      )
})

export {
   registerUser,
   loginUser,
   logoutUser,
   refreshAccessToken,
   changeCurrentPassword,
   getCurrectUser,
   updateAccountDetails,
   updateUserAvatar,
   updateUserCoverImage,
   getUserChannelProfile,
   getWatchHistory
}