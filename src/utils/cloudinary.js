import { v2 as  cloudinary} from "cloudinary";
import fs from "fs";

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_NAME, 
  api_key: process.env.CLOUDINARY_KEY, 
  api_secret: process.env.CLOUDINARY_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {

    if (!localFilePath) return null

    try {
        const response = cloudinary.uploader.upload(localFilePath,
            {
                resource_type: 'auto'
            })
    
        console.log("File uploaded successfully on cloudinary ", response.url)
    
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath)
        console.log("Cloudinary upload failed", error)
    }
}

export {uploadOnCloudinary}