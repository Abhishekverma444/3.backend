import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'

const registerUser = asyncHandler(async(req, res) => {
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

   if( existedUser ) {
    throw new ApiError(409, "User with email or username already exists")
   }

   console.log("req.files :- ", req.files);

   const avatarLocalPath = req.files?.avatar[0]?.path
//    const coverImageLocalPath = req.files?.coverImage[0]?.path;

   let coverImageLocalPath;
   if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path;
   }

   if( !avatarLocalPath ){
    throw new ApiError(400, "Avatar file is required")
   }

   const avatar = await uploadOnCloudinary(avatarLocalPath)
   const coverImage = await uploadOnCloudinary(coverImageLocalPath) // agar yahan coverImage nhi mil rahi hai to cloudinary ek empty string send kar deta hai

   if(!avatar){
    throw new ApiError(400, "Avatar file is required")
   }

   const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
   })

   const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
   )

   if(!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user")
   }
    
   return res.status(201).json(
    new ApiResponse(200, createdUser, " User registered successfully ")
   )

})

export { registerUser }