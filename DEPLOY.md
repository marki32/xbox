# 🚀 Deploy to Render (Free Cloud Hosting)

## Step 1: Create GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click **"New Repository"**
3. Name it `xbox-mobile-controller`
4. Set to **Public** (for free Render deployment)
5. Click **"Create Repository"**

## Step 2: Push Code to GitHub

Open terminal in the `mobile-controller` folder and run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/xbox-mobile-controller.git
git push -u origin main
```

## Step 3: Deploy on Render

1. Go to [render.com](https://render.com) and sign up (free)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account
4. Select your `xbox-mobile-controller` repository
5. Settings:
   - **Name:** `xbox-mobile-controller` (or any name you like)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** `Free`
6. Click **"Create Web Service"**
7. Wait 2-3 minutes for deployment

## Step 4: Get Your URL

After deployment, Render gives you a URL like:
```
https://xbox-mobile-controller.onrender.com
```

## Step 5: Update Chrome Extension

1. Open `xbox-controller-extension/socket_bridge.js`
2. Change line 8 from:
   ```js
   const SERVER_URL = 'http://localhost:3000';
   ```
   To:
   ```js
   const SERVER_URL = 'https://YOUR-APP-NAME.onrender.com';
   ```
3. **Reload the extension** in Chrome:
   - Go to `chrome://extensions`
   - Click the refresh button on your extension

## Step 6: Use It!

1. **Phone:** Open `https://YOUR-APP-NAME.onrender.com` in browser
2. **PC:** Open Xbox Cloud Gaming and play!

## ⚠️ Important Notes

- **Free tier:** Server may sleep after 15 mins of inactivity. First connection takes ~30 seconds to wake up.
- **Works anywhere:** Phone and PC don't need to be on same WiFi anymore!
- **Share with friends:** Send them your Render URL and they can use it too!

## 🔧 Troubleshooting

**"Disconnected" on phone?**
- Wait 30 seconds for server to wake up (free tier)
- Refresh the page

**Controls not working?**
- Make sure you updated `socket_bridge.js` with your Render URL
- Reload the Chrome extension
- Refresh Xbox Cloud Gaming page
