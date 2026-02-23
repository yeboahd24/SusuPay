# SusuPay Deployment Guide

## Separate Deployments

The backend and frontend are deployed separately on Render.

### Backend Deployment

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "Blueprint"
3. Connect your GitHub repository
4. Select the `susupay-backend` directory
5. Render will use `susupay-backend/render.yaml`
6. Set the required environment variables in Render dashboard:
   - `DATABASE_URL`
   - `DATABASE_URL_SYNC`
   - `REDIS_URL`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `HUBTEL_CLIENT_ID`
   - `HUBTEL_CLIENT_SECRET`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_PUBLIC_KEY`

### Frontend Deployment

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "Static Site"
3. Connect your GitHub repository
4. Select the `susupay-frontend` directory
5. Build Command: `npm install && npm run build`
6. Publish Directory: `dist`
7. Set environment variables:
   - `VITE_API_URL`: Your backend API URL (e.g., https://susupay-api.onrender.com)
   - `VITE_VAPID_PUBLIC_KEY`: Your VAPID public key

### Alternative: Use Blueprint for Each

You can also use the individual `render.yaml` files:
- Backend: Deploy from `susupay-backend/render.yaml`
- Frontend: Deploy from `susupay-frontend/render.yaml`

## Important Notes

- Update CORS_ORIGINS in backend to include your frontend URL
- Update VITE_API_URL in frontend to point to your backend URL
- Ensure all environment variables are set before deploying
