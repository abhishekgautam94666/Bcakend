import { config } from "dotenv";
import connectDB from "./db/dbConnect.js";
import { app } from "./app.js";

config({
  path: "./.env",
});

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running at port : ${process.env.PORT}`);
    });
    app.on("error", (error) => {
      console.log("ERROR :", error);
      throw error;
    });
  })
  .catch((errr) => {
    console.log("MONGO db connection failed !!! ", errr);
  });
