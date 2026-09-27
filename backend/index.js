import dbConnection from "./src/db/dbConnection.js";
import { v2 as cloudinary } from 'cloudinary';
import app from "./app.js";

// V-06 fix (defence in depth): a single unhandled promise rejection or uncaught
// exception used to terminate the whole Node process — that is how one request to
// the payment endpoint took the entire service down. Log these instead of letting
// the process die, so no single unexpected error can cause a denial of service.
// (The primary fix is wrapping the controllers in asyncHandler; this is a safety
// net for any future unwrapped async error.)
process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err);
});

// cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


// Database connnection configuration
dbConnection()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
        })
    })
    .catch((err) => {
        console.log("MONGO db connection failed !!! ", err);
    })
