const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Monthly jobs (leave +1.5 on the 1st, last month's salary). Hostinger may put the app to sleep,
// so besides the hourly timer we also check (at most every 10 minutes) whenever the API is used.
const payroll = require("./services/payroll");
app.use("/api", (req, res, next) => { payroll.runDue(); next(); });

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
app.use("/api/face", require("./routes/face"));
app.use("/api/leave", require("./routes/leave"));
app.use("/api/payslips", require("./routes/payslips"));

const { leadsRouter } = require("./routes/modules");
app.use("/api/leads", leadsRouter);

app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html")),
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅ Awelion running on port ${PORT}`),
);

require("./db/faceSchema")
  .ensureFaceTables()
  .then(() => console.log("✅ Face attendance tables ready"))
  .catch((err) => console.error("⚠️ Could not prepare face attendance tables:", err.message));

require("./db/attendanceSchema")
  .ensureAttendanceColumns()
  .then(() => require("./db/payrollSchema").ensurePayrollTables())
  .then(() => require("./services/leave").ensureOpeningBalances())
  .then(() => {
    console.log("✅ Leave & salary tables ready");
    payroll.setReady();
    payroll.runDue({ force: true });
    setInterval(() => payroll.runDue({ force: true }), 60 * 60 * 1000);
  })
  .catch((err) => console.error("⚠️ Could not prepare leave & salary tables:", err.message));
