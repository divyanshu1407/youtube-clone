import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors"
const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

import userRouter from "./routes/user.route.js"

app.use("/api/v1/users", userRouter )

import videoRouter from "./routes/video.route.js"

app.use("/api/v1/videos", videoRouter)

import subscriptionRouter from "./routes/subscription.route.js"

app.use("/api/v1/subscriptions", subscriptionRouter)

export {app};