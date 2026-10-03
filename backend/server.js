require("dotenv").config();
const dns = require("dns");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

// Windows sometimes hands Node a DNS server (often a router's IPv6 link-local
// address) that can't resolve mongodb+srv:// SRV records, causing
// "querySrv ECONNREFUSED" even though the system's own DNS tool works fine.
// Forcing Node to use Google's public DNS for this lookup sidesteps that,
// without needing any changes to the machine's actual network settings.
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const authRoutes = require("./routes/auth");
const donorRoutes = require("./routes/donors");
const requestRoutes = require("./routes/requests");
const statsRoutes = require("./routes/stats");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ ok: true, service: "raktsetu-backend", version: "0.3.0" });
});

app.use("/api/auth", authRoutes);
app.use("/api/donors", donorRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/stats", statsRoutes);

// Fallback error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB Atlas");
    app.listen(PORT, () => console.log(`RaktSetu backend running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
