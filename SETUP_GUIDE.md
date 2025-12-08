# 🚀 Quick Setup Guide

Follow these simple steps to get your Property Inspection app running!

---

## ✅ Step 1: Install Dependencies

Open your terminal in the VisitProp folder and run:

```bash
npm install
```

This will install all the React and frontend dependencies.

---

## ✅ Step 2: Your `.env` File is Ready!

Good news! I've already created your `.env` file with this content:

```
VITE_API_BASE_URL=http://localhost:8080/api
```

This tells your frontend app to connect to the mock server on port 8080.

**You don't need to do anything else with the `.env` file right now!**

---

## ✅ Step 3: Start the Mock Backend Server

The mock server simulates Google Sheets and Google Drive for testing.

**In Terminal 1**, run:

```bash
npm run server
```

You should see:
```
🚀 ========================================
✅ Mock API Server is running!
📍 URL: http://localhost:8080
========================================

📊 Mock Database: 1000 properties loaded

💡 Try searching for: 843, النخيل, المنامة
```

**Keep this terminal running!**

---

## ✅ Step 4: Start the Frontend App

**Open a NEW terminal** (Terminal 2) and run:

```bash
npm run dev
```

You should see:
```
  VITE v5.0.8  ready in XXX ms

  ➜  Local:   http://localhost:3000/
```

---

## ✅ Step 5: Open Your Browser

Open your browser and go to:

**http://localhost:3000**

You should see the Property Report form! 🎉

---

## 🧪 Testing the App

Try these searches to test:

1. **Search for code**: Type `843` in the property search
2. **Search for name**: Type `النخيل` (Arabic)
3. **Search for area**: Type `المنامة`

Then:
- Fill out the form
- Upload some photos (from your computer)
- Add findings and actions
- Submit the report!

---

## 📱 Testing on Your Phone

1. Find your computer's local IP address:
   - **Mac/Linux**: Run `ifconfig | grep inet`
   - **Windows**: Run `ipconfig`
   - Look for something like `192.168.1.XXX`

2. Update your `.env` file:
   ```
   VITE_API_BASE_URL=http://192.168.1.XXX:8080/api
   ```

3. Access from your phone's browser:
   ```
   http://192.168.1.XXX:3000
   ```

Make sure your phone is on the same WiFi network!

---

## 🐛 Troubleshooting

### "Cannot GET /api/properties"
- Make sure the mock server (Terminal 1) is still running
- Check that it's running on port 8080

### "Network Error"
- Verify the `.env` file has the correct URL
- Restart the frontend app after changing `.env`

### Port Already in Use
If port 3000 or 8080 is taken:
- **Frontend**: Vite will automatically use another port
- **Backend**: Edit `server/server.js` line 8 to change the port

---

## 📊 View Submitted Reports

To see all submitted reports, open this URL:

**http://localhost:8080/api/reports**

This will show you all the reports in JSON format!

---

## 🎯 Summary of Commands

| Action | Command |
|--------|---------|
| Install dependencies | `npm install` |
| Start backend server | `npm run server` |
| Start frontend | `npm run dev` |
| Build for production | `npm run build` |

---

## 🔄 When You're Ready for Production

When you have a real backend that connects to Google Sheets and Google Drive:

1. Update your `.env` file:
   ```
   VITE_API_BASE_URL=https://your-real-backend.com/api
   ```

2. Build the app:
   ```bash
   npm run build
   ```

3. Deploy the `dist/` folder to your hosting service!

---

## ❓ Need Help?

Check these files for more details:
- `README.md` - Complete documentation
- `server/README.md` - Mock server details
- `.env.example` - Environment variable template

---

**That's it! You're all set! 🚀**
