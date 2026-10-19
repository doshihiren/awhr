# Awelion ERP

HR, attendance (with face-scan kiosk), payroll, billing, accounts and projects for Awelion.
Live app: https://mediumorchid-butterfly-106989.hostingersite.com

## Folders

| Folder | What it is |
|---|---|
| `nodejs/` | The Express server Hostinger runs (`server.js`), API routes, and the built website in `nodejs/public/` |
| `frontend/` | React source code for the website. Build it to update `nodejs/public/` |
| `public_html/.htaccess` | Hostinger Passenger config that points the domain at `nodejs/` |

## Changing the website (frontend)

```bash
cd frontend
npm install        # first time only
npm run build      # writes nodejs/public/index.html + static/js/main.<hash>.js
```

Commit the rebuilt `nodejs/public` files together with your source changes.

## Deploying to Hostinger

SSH in (hPanel → Advanced → SSH Access), then:

```bash
cd ~/domains/mediumorchid-butterfly-106989.hostingersite.com
cp -r nodejs ~/nodejs-backup-$(date +%F-%H%M)            # backup first
rm -rf ~/awhr-new && git clone --depth 1 https://github.com/doshihiren/awhr.git ~/awhr-new
cp -r ~/awhr-new/nodejs/. nodejs/                         # .env and node_modules are not touched
mkdir -p nodejs/tmp && touch nodejs/tmp/restart.txt       # restarts the app
```

To roll back: copy the backup folder over `nodejs/` and touch `nodejs/tmp/restart.txt` again.

No new npm packages are needed on the server. The face-attendance database tables
(`face_profiles`, `kiosk_devices`, `face_scan_logs`) are created automatically when the app starts.

## Leave & salary (owner only)

- **Leave**: one type, earned leave. +1.5 days is added to every active employee automatically on the
  1st of every month (from November 2026). Owner/HR can *Set balance* on the Leave page.
  Leave, absent and half days (½) are taken from the balance when salary is calculated; beyond the
  balance they are unpaid. Every change is kept in the `leave_ledger` table (employees see their history).
- **Salary**: calculated automatically on the 1st for the month that just ended (also on the next app
  visit if the server was asleep). Per-day pay = monthly salary ÷ days in month. Professional tax ₹200
  when earned salary ≥ ₹12,000; approved salary advances are recovered in their recovery month.
  Owner page *Salary*: recalculate, bonus / other deduction, payslip (Print → PDF), mark paid (locks it).
- HR and employees cannot see salary figures, payslips or the Salary page (enforced on the server).

Optional `.env`: `LEAVE_ACCRUAL_START=2026-11`, `PAYROLL_AUTO_START=2026-10`.

## Face-scan attendance

1. **Register faces** — Owner → *Face Attendance* → *Employees* → **Register** (about 5 seconds per person).
2. **Set up the kiosk** — on a tablet at the entrance open `/kiosk`, sign in once with the owner account, name the kiosk, allow the camera.
3. **Daily use** — staff look at the tablet. First scan of the day = check-in, a scan 30+ minutes later = check-out.
   Office-hour rules (late arrival, half day) are the same as normal check-in.
4. **Review** — *Face Attendance* → *Scan log* shows every scan with a photo; unknown faces are listed too.
   Switch off a lost/stolen tablet in *Kiosks*.

Optional `.env` settings:

```
FACE_MATCH_THRESHOLD=0.5    # lower = stricter matching (default 0.5)
FACE_MIN_GAP_MINUTES=30     # minimum minutes between check-in and check-out scans
```

Notes
- Face detection runs in the tablet's browser (face-api.js loaded from jsDelivr); matching happens on the server.
- The kiosk needs HTTPS (already on for the hostingersite.com domain) and an internet connection.
- A printed photo can sometimes fool a basic camera, so HR should glance at the scan log photos.
- Scan photos older than 90 days are deleted automatically.
