const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/attendance", require("./routes/attendance"));
app.use("/api/hr", require("./routes/hr"));
app.use("/api/accounts", require("./routes/accounts"));
app.use("/api/tasks", require("./routes/tasks"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/employees", require("./routes/employees"));
app.use("/api/billing", require("./routes/billing"));
app.use("/api/fin", require("./routes/accountsDashboard"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/client", require("./routes/clientPortal"));
app.use("/api/settings", require("./routes/settings"));

const { leadsRouter } = require("./routes/modules");
app.use("/api/leads", leadsRouter);

app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html")),
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅ Awelion Session 5 running on port ${PORT}`),
);
