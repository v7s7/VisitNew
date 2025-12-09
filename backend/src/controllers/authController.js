import * as googleAuth from '../config/google-oauth.js';

/**
 * Render login page
 * GET /auth/login
 */
export function loginPage(req, res) {
  const isAuth = googleAuth.isAuthenticated();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VisitProp - Google Authentication</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    }

    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 28px;
    }

    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 16px;
    }

    .status {
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 24px;
      font-size: 14px;
    }

    .status.success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .status.warning {
      background: #fff3cd;
      color: #856404;
      border: 1px solid #ffeaa7;
    }

    .status-icon {
      font-size: 20px;
      margin-right: 8px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 14px 28px;
      background: #4285f4;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      font-size: 16px;
      transition: background 0.2s;
      border: none;
      cursor: pointer;
      width: 100%;
    }

    .btn:hover {
      background: #357ae8;
    }

    .btn img {
      width: 20px;
      height: 20px;
      margin-right: 12px;
    }

    .info {
      margin-top: 24px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 6px;
      font-size: 14px;
      color: #555;
    }

    .info-title {
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
    }

    .info ul {
      margin-left: 20px;
      margin-top: 8px;
    }

    .info li {
      margin-bottom: 4px;
    }

    .btn-secondary {
      background: #6c757d;
      margin-top: 12px;
    }

    .btn-secondary:hover {
      background: #5a6268;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔐 VisitProp Authentication</h1>
    <p class="subtitle">Connect your Google Account</p>

    ${isAuth ? `
      <div class="status success">
        <span class="status-icon">✅</span>
        <strong>Connected!</strong> Your Google account is authenticated and ready.
      </div>

      <a href="/api/health" class="btn btn-secondary">
        View API Status
      </a>
    ` : `
      <div class="status warning">
        <span class="status-icon">⚠️</span>
        <strong>Not Connected.</strong> Please sign in with your Google account to enable the backend.
      </div>

      <a href="/auth/google" class="btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Sign in with Google
      </a>

      <div class="info">
        <div class="info-title">📝 What happens next?</div>
        <ul>
          <li>You'll be redirected to Google's secure login page</li>
          <li>Grant VisitProp access to your Google Sheets and Drive</li>
          <li>Your credentials will be stored securely on this server</li>
          <li>The backend will be able to access your personal Drive and Sheets</li>
        </ul>
      </div>
    `}
  </div>
</body>
</html>
  `;

  res.send(html);
}

/**
 * Redirect to Google OAuth
 * GET /auth/google
 */
export function redirectToGoogle(req, res) {
  try {
    const authUrl = googleAuth.generateAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    res.status(500).send(`
      <h1>Configuration Error</h1>
      <p>${error.message}</p>
      <a href="/auth/login">← Back</a>
    `);
  }
}

/**
 * OAuth callback handler
 * GET /auth/callback
 */
export async function handleCallback(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(`
      <h1>Authentication Failed</h1>
      <p>Error: ${error}</p>
      <a href="/auth/login">← Try Again</a>
    `);
  }

  if (!code) {
    return res.status(400).send(`
      <h1>Invalid Request</h1>
      <p>No authorization code received.</p>
      <a href="/auth/login">← Back</a>
    `);
  }

  try {
    // Exchange code for tokens
    const tokens = await googleAuth.getTokensFromCode(code);

    // Save tokens
    googleAuth.saveTokens(tokens);

    console.log('✅ OAuth authentication successful!');
    console.log('   User authenticated and tokens saved');

    // Redirect to success page
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authentication Successful</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    }
    .success-icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    h1 {
      color: #155724;
      margin-bottom: 16px;
    }
    p {
      color: #666;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background: #28a745;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
    }
    .btn:hover {
      background: #218838;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-icon">✅</div>
    <h1>Authentication Successful!</h1>
    <p>
      Your Google account has been connected successfully.<br>
      The VisitProp backend is now ready to use your personal Google Drive and Sheets.
    </p>
    <p>
      <strong>You can close this window and refresh your app.</strong>
    </p>
    <a href="/api/health" class="btn">View API Status</a>
  </div>
  <script>
    // Auto-close after 3 seconds if opened in popup
    if (window.opener) {
      setTimeout(() => {
        window.opener.postMessage('auth-success', '*');
        window.close();
      }, 3000);
    }
  </script>
</body>
</html>
    `);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send(`
      <h1>Authentication Error</h1>
      <p>${error.message}</p>
      <a href="/auth/login">← Try Again</a>
    `);
  }
}

/**
 * Check authentication status
 * GET /auth/status
 */
export function checkStatus(req, res) {
  const isAuth = googleAuth.isAuthenticated();

  res.json({
    authenticated: isAuth,
    message: isAuth
      ? 'User is authenticated'
      : 'User needs to authenticate. Visit /auth/login'
  });
}

/**
 * Logout (clear tokens)
 * POST /auth/logout
 */
export function logout(req, res) {
  try {
    const tokenPath = process.env.OAUTH_TOKEN_PATH || './oauth-tokens.json';
    const fs = await import('fs');

    if (fs.existsSync(tokenPath)) {
      fs.unlinkSync(tokenPath);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
