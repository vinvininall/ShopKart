require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const customerRoutes = require("./routes/customer.routes");

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/customers", customerRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ShopKart Authentication Service",
  });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
