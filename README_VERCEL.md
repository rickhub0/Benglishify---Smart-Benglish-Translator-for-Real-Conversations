# Deploying Benglishify to Vercel

This project is now configured for easy deployment to Vercel.

## Deployment Steps

1.  **Push to GitHub**: Push your code to a GitHub repository.
2.  **Connect to Vercel**:
    *   Go to [Vercel](https://vercel.com).
    *   Click "Add New" -> "Project".
    *   Import your repository.
3.  **Configure Environment Variables**:
    *   In the Vercel project settings, go to **Environment Variables**.
    *   Add `GEMINI_API_KEY` with your Google Gemini API key.
4.  **Deploy**: Click "Deploy".

## Configuration Details

*   **`vercel.json`**: Configures Vercel to handle the Express server as a serverless function for API routes and serve the Vite frontend as static files.
*   **`api/index.ts`**: The entry point for Vercel's serverless functions.
*   **`server.ts`**: Refactored to export the Express app, making it compatible with both local development and Vercel.

## Important Notes

*   **Serverless Timeout**: Vercel's free tier has a 10-second timeout for serverless functions. If the Gemini API takes longer than 10 seconds to respond, the request may fail. For complex translations, you may need a Pro plan or to optimize the prompt.
*   **Cold Starts**: The first request after a period of inactivity may be slower due to serverless "cold starts".

## Chrome Extension Note

After deploying, you will need to update the `API_URL` in your Chrome extension files (`extension/popup.js` and `extension/background.js`) to point to your new Vercel deployment URL (e.g., `https://your-project.vercel.app/api/translate`).
