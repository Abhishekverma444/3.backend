import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'

const generateAccessAndRefreshTokens = async (userId) => {
   try {
      const user = await User.findById(userId)
      const accessToken = user.generateAccessToken()
      const refreshToken = user.generateRefreshToken()

      user.refreshToken = refreshToken
      await user.save({ validateBeforeSave: false }) // Save the user object without performing validation to optimize performance.

      return {accessToken, refreshToken}

   } catch (error) {
      throw new ApiError(500, "Something went wrong while generating refresh and access token")
   }
}

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


const loginUser = asyncHandler(async (req, res)=> {
   // req.body -> data
   // username or email 
   // find the user and error if not found
   // password check
   // access and refresh token
   // remove (-password -refreshToken) from res->loggedInUser
   // send cookie

   const {email, username, password} = req.body;

   if( !(username || email) ){
      throw new ApiError(400, "username or email is required")
   }

   const user = await User.findOne({ // .findOne() if not found then it return `null`
      $or: [ {username}, {email}] // username ya email jo bhi hai usi se find kar lo
   })

   if(!user){
      throw new ApiError(404, "User does not exist")
   }

   // User- ye user to mongodb ka hai 
   // user - ye user jiska instance aapne batabase se liya hia , iske paas un methods ka access hai , jise aapne banaya hai
   const isPasswordValid = await user.isPasswordCorrect(password)

   if(!isPasswordValid){
      throw new ApiError(401, "Invalid user credentials")
   }

   const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

   const  loggedInUser = await User.findById(user._id).select("-password -refreshToken")

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


const logoutUser = asyncHandler( async(req,res) => {
   User.findByIdAndUpdate(
      req.user._id,
      {
         $set: {
            refreshToken: undefined
         }
      },
      {
         new: true
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

export { 
   registerUser ,
   loginUser,
   logoutUser
}