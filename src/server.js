require("dotenv").config();
const app = require("./app");
const { connectDB } = require("./config/db");

const port = process.env.PORT || 4000;

connectDB(process.env.MONGODB_URI)
  .then(() => {
    app.listen(port, () => console.log(`Transaction Ledger API listening on port ${port}`));
  })
  .catch((error) => {
    console.error("Failed to start API:", error.message);
    process.exit(1);
  });
