const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

// Fail fast with a clear message instead of a confusing crash later
for (const key of ["MONGO_URI", "JWT_SECRET"]) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key} (see .env.example)`);
    process.exit(1);
  }
}

// app.js holds the Express app (so tests can import it without starting a server)
const app = require("./app");

const PORT = process.env.PORT || 5000;

// Start only after the database is connected
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((error) => {
    console.error("MongoDB Error:", error.message);
    process.exit(1);
  });
