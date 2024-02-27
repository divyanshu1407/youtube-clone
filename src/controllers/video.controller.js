import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const PublishVideo = asyncHandler( async (req,res) => {

    const { title, description } = req.body

    if ([title, description].some((field) => field?.trim() === ""))
    {
        throw new ApiError(400,"Title/Description missing")
    }

    let videoLocalPath;

    if (req.files && Array.isArray(req.files.video) && req.files.video.length > 0)
    {
        videoLocalPath = req.files.video[0].path
    }

    if (!videoLocalPath)
    {
        throw new ApiError(400,"Video required")
    }

    let thumbnailLocalPath;

    if (req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0)
    {
        thumbnailLocalPath = req.files.thumbnail[0].path
    }

    if (!thumbnailLocalPath)
    {
        throw new ApiError(400, "Thumbnail required")
    }

    const videoFile = await uploadOnCloudinary(videoLocalPath)

    if (!videoFile)
    {
        throw new ApiError(500, "Upload video failed")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if (!thumbnail)
    {
        throw new ApiError(500, "Upload thumbnail failed")
    }

    console.log(videoFile.duration)

    const video = await Video.create({
        videoFile: videoFile.url ,
        thumbnail: thumbnail.url,
        title,
        description,
        duration : videoFile.duration,
        owner: req.user?._id
    })

    if (!video)
    {
        throw new ApiError(500, "Something went wrong while uploading video")
    }

    res.status(200).json(new ApiResponse(200, video, "Video Published"))

})

export {PublishVideo}