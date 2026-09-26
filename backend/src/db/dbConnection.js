import mongoose from "mongoose";
import { DB_NAME } from "../../constants.js";

import dotenv from 'dotenv';
dotenv.config();

// V-07 fix: neutralise NoSQL operator injection globally. With sanitizeFilter
// on, if a query value from user input is an object containing operators
// (e.g. email = {"$gt":""}), Mongoose wraps it in $eq and treats it as a
// literal value to match instead of running it as a query operator. This
// protects every findOne/find that takes user input (login, register, etc.)
// in one place, without editing each controller.
mongoose.set('sanitizeFilter', true);

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MONGODB connection FAILED ", error);
        process.exit(1)
    }
}

export default connectDB