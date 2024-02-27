import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Video } from "../models/video.model.js";

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

const refreshAccessToken = asyncHandler (async (req,res) => {

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken)
    {
        throw new ApiError(400, "Invalid refresh token")
    }

    try {
        const decodedToken = jwt.decode(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken._id)
    
        if (!user)
        {
            throw new ApiError(400, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken)
        {
            throw new ApiError(400, "Refresh token expired")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, refreshToken} = generateAccessAndRefreshTokens()
    
        return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json( new ApiResponse(200, { accessToken, refreshToken}, 
            "Access token refreshed "))

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid ")
    }
    

})

const getChannelProfile = asyncHandler (async (req,res) => {

    const {username} = req.params

    if (!username)
    {
        throw new ApiError(400, "username required")
    }

    const channel =  await User.aggregate([
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
                channelsSubscribedToCount : {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user._id , "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                username: 1,
                fullName: 1,
                email: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                coverImg: 1,
                avatar: 1
            }
        }
    ])

    if (!channel?.length)
    {
        throw new ApiError(404, "Channel does not exists")
    }


    const channel_id = await User.findOne({
        username: username
    })

    const videos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(channel_id),
                isPublished: true
            }
        },
        {
            $project: {
                _id: 1,
                thumbnail: 1,
                title: 1,
                duration: 1,
                views: 1
            }
        }
    ])

    const channelInfo = channel[0]

    channelInfo.videos = videos

    return res.status(200).json(new ApiResponse(200, channelInfo, "Channel details"))

})

const getWatchHistory = asyncHandler (async (req, res) => {

    const id = req.user?.id

    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(id)
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
                                        username: 1,
                                        avatar: 1,
                                        fullName: 1
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

    console.log(user)

    return res.status(200).json(new ApiResponse(200, user[0].watchHistory, "Watch history fetched"))
})

export {registerUser, loginUser, logoutUser, refreshAccessToken, getChannelProfile, getWatchHistory}