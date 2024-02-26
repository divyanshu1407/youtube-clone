import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler (async (req, res) => {

    const {fullName, username, email, password} = req.body

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

    const avatarLocalpath = req.files?.avatar[0]?.path;
    const coverImageLocalpath = req.files?.coverImage[0]?.path;

    if (!avatarLocalpath) {
        throw new ApiError(400, "Avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalpath);
    const coverImage = await uploadOnCloudinary(coverImageLocalpath)

    if (!avatar)
    {
        throw new ApiError(400, "Avatar is required, Cloudinary failed")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        username: username.toLowerCase(),
        password
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if (!createdUser)
    {
        throw ApiError(500, "Something went wrong while creating user")
    }

    return res.json(200).json(new ApiResponse(200, createdUser, "User Created successfully"))


})

export {registerUser}