const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const accountRoutes = require("./routes/accountRoutes");
const transferRoutes = require("./routes/transferRoutes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const path = require("path");

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "100kb" }));
app.use(morgan("dev"));

// Serve frontend files from the public folder
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/health", (req, res) => res.json({ success: true, message: "Transaction Ledger API is healthy" }));
app.use("/api/accounts", accountRoutes);
app.use("/api/transfers", transferRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
