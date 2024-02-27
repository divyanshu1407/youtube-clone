import { Subscription } from "../models/subscription.model.js"
import { User } from "../models/user.model.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"



const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelName} = req.params

    
    const user = await User.aggregate([
        {
            $match: {
                username: channelName
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
            $addFields: {
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user._id , "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                },
                subscribersId: {
                    $first: "$subscribers.subscriber"
                }
            }
        },
        {
            $project: {
                isSubscribed: 1,
                subscribersId: 1
            }
        }
    ])


    const isSubscribed = user[0].isSubscribed

    const channelUser = await User.findOne(
        {
            username: channelName
        }
    )


    if (!isSubscribed)
    {
        const subscribed = await Subscription.create({
            channel: channelUser._id,
            subscriber: req.user._id
        })

    }
    else
    {
        await Subscription.deleteMany({
            channel: channelUser._id,
            subscriber: req.user._id
        })
    }

    res.status(200).json(
        new ApiResponse(200, { subscription : !isSubscribed }, "User subscription toggled")
    )
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}