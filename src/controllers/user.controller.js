import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler (async (req, res) => {

    const {fullName, username, email, password} = req.body

    console.log(req.body, email, username, password)

    if ([fullName, username, email, password].
        some((field) => field?.trim() === ""))
    {
        throw new ApiError(400, "All fields are required")
    }

    const existingUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if (existingUser){
        throw new ApiError(400, "User already exists")
    }

    let avatarLocalpath;
    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0 )
    {
        avatarLocalpath = req.files.avatar[0].path;
    }

    let coverImageLocalpath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0 )
    {
        coverImageLocalpath = req.files.coverImage[0].path;
    }

    if (!avatarLocalpath) {
        throw new ApiError(400, "Avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalpath);
    console.log(coverImageLocalpath)
    const coverImage = await uploadOnCloudinary(coverImageLocalpath)

    if (!avatar)
    {
        throw new ApiError(400, "Avatar is required, Cloudinary failed")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImg: coverImage?.url || "",
        email,
        username: username.toLowerCase(),
        password
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if (!createdUser)
    {
        throw new ApiError(500, "Something went wrong while creating user")
    }

    return res.status(200).json(new ApiResponse(200, createdUser, "User Created successfully"))


})

const generateAccessAndRefreshTokens = async(userId) => {

    const user = await User.findById(userId)

    const accessToken = await user.generateAccessToken()
    const refreshToken = await user.generateRefreshToken()

    user.refreshToken = refreshToken
    user.save({validateBeforeSave : false})

    return {accessToken, refreshToken}
}

const loginUser = asyncHandler (async (req, res) => {

    const { username, email, password} = req.body

    console.log(req.body, email, username, password)

    if (!username && !email)
    {
        throw new ApiError(400, "Username or email required")
    }

    const user = await User.findOne({
        $or: [{email}, {username}]
    })

    if (!user)
    {
        throw new ApiError(400, "invalid user")
    }

    const isPasswordCorrect = await user.isPasswordCorrect(password)

    if (!isPasswordCorrect)
    {
        throw new ApiError(400, "Invalid password")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json( new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken}, 
        "User logged in successfully"))

})

const logoutUser = asyncHandler (async (req, res) => {

    await User.findByIdAndUpdate( req.user?.id, 
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"))


    
})

export {registerUser, loginUser, logoutUser}