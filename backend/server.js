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
const campsRoutes = require("./routes/camps");
const Donor = require("./models/Donor");

const app = express();
// Needed so req.ip reflects the real client IP (not Render's proxy IP) once
// deployed — used by the guest-request rate limiter (v1.2).
app.set("trust proxy", true);

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
app.use("/api/camps", campsRoutes);

// Fallback error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB Atlas");
    // Keeps indexes in sync with the current schema on every boot — this is
    // what drops the old single-field unique index on Donor.user (from before
    // family accounts) and replaces it with the new {user, familyMemberId}
    // one, with no manual database surgery needed.
    try {
      await Donor.syncIndexes();
    } catch (err) {
      console.error("Index sync failed (non-fatal):", err.message);
    }
    app.listen(PORT, () => console.log(`RaktSetu backend running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
