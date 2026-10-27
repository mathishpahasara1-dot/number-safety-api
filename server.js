
const express = require("express");

const app = express();
app.use(express.json({ limit: "10kb" }));

const reports = new Map();

function normalizeNumber(value) {
  if (typeof value !== "string") return null;

  const number = value.replace(/[\s()-]/g, "");

  // Accept international format, including Sri Lankan +94 numbers.
  if (!/^\+[1-9]\d{7,14}$/.test(number)) {
    return null;
  }

  return number;
}

app.get("/", (req, res) => {
  res.json({
    name: "Number Safety API",
    version: "1.0.0",
    status: "running",
    endpoints: ["/api/check", "/api/report"]
  });
});

app.get("/api/check", (req, res) => {
  const number = normalizeNumber(req.query.number);

  if (!number) {
    return res.status(400).json({
      error: "Valid international number required, e.g. +94771234567"
    });
  }

  const entries = reports.get(number) || [];

  res.json({
    number,
    reportCount: entries.length,
    status: entries.length ? "reported" : "no_reports",
    message: entries.length
      ? "Reports exist. Verify independently before taking action."
      : "No reports found. This does not guarantee the number is safe."
  });
});

app.post("/api/report", (req, res) => {
  const number = normalizeNumber(req.body?.number);
  const category = req.body?.category;

  const allowed = [
    "scam",
    "harassment",
    "threat",
    "spam"
  ];

  if (!number || !allowed.includes(category)) {
    return res.status(400).json({
      error: "Provide a valid international number and category",
      allowedCategories: allowed
    });
  }

  const entries = reports.get(number) || [];

  if (entries.length >= 20) {
    return res.status(429).json({
      error: "Report limit reached for this number"
    });
  }

  entries.push({
    category,
    createdAt: new Date().toISOString(),
    verified: false
  });

  reports.set(number, entries);

  res.status(201).json({
    success: true,
    message: "Report received for review",
    reportCount: entries.length,
    verified: false
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Number Safety API running on port ${PORT}`);
});
