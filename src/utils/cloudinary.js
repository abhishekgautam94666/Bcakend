import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // file has been uploaded successfull
    console.log("file is uploaded on cloudinary ", response.url);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload operation got failed
    return null;
  }
};

// const deleteFromCloudinary = async (publicId, resource_type) => {
//   try {
//     if (!publicId) {
//       return null;
//     }
//     const response = cloudinary.api.delete_resources([publicId], {
//       type: "upload",
//       invalidate: true,
//       resource_type: resource_type,
//     });

//     return response;
//   } catch (error) {
//     throw new ApiError(400, error.message);
//   }
// };

const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return null;
    // Delete the image from Cloudinary
    const response = await cloudinary.uploader.destroy(publicId);
    console.log("Image deleted from Cloudinary");
    return response;
  } catch (error) {
    console.error("Error deleting image from Cloudinary: ", error);
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
