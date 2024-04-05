import { v2 as cloudinary } from "cloudinary";
import fs from "fs"
import axios from 'axios'


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        // upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto'
        })
        // file has been uploaded successfully
        // console.log("file is uploaded on cloudinary", response.url);
        console.log("file is uploaded on cloudinary", response);
        fs.unlinkSync(localFilePath) // jab cloudinary pe upload ho jaye, uske bad delete ho hamare server se
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null
    }
}

const deleteCloudinaryImage = async (url) => {
    try {
        // extracting public_id from url
        const parts = url.split('/');
        const filename = parts[parts.length - 1];
        const public_id = filename.split('.')[0];

        const response = await cloudinary.uploader.destroy(public_id)
        console.log("Image Deleted successfully");
        return 
    } catch (error) {
        console.log("Image is not deleted from cloudinary");
        return null
    }
}

const deleteCloudinaryVideo = async (url) => {
    try {
        // extracting public_id from url
        const parts = url.split('/');
        const filename = parts[parts.length - 1];
        const public_id = filename.split('.')[0];

        const response = await cloudinary.uploader.destroy(public_id,{
            resource_type: 'video'
        })
        console.log("Video Deleted successfully");
        return 
    } catch (error) {
        console.log("Video is not deleted from cloudinary");
        return null
    }
}

const getVideoViews = async (public_id) => {
    try {
        const response = await axios.get(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/resources/video/${public_id}`, {
            params: {
                type: 'upload',
                access_mode: 'public'
            },
            auth: {
                username: process.env.CLOUDINARY_API_KEY,
                password: process.env.CLOUDINARY_API_SECRET
            }
        });

        const videoInfo = response.data;
        const viewCount = videoInfo.views;
        console.log("getVideoViews",response);
        // console.log(`View count for video ${public_id}: ${viewCount}`);
        return viewCount;
    } catch (error) {
        console.error("Error fetching video analytics:", error);
        return null;
    }
};


export { uploadOnCloudinary, getVideoViews, deleteCloudinaryImage, deleteCloudinaryVideo }