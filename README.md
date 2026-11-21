# Elite Wheelz

A React storefront and an Express/MongoDB API for a pre-owned car dealership. Customers can browse cars, send buyer or seller enquiries, and contact the dealership through WhatsApp. The password-protected owner dashboard manages inventory, enquiry follow-ups, and reports.

## Run locally

1. Install Node.js and start a local MongoDB instance, or create a MongoDB Atlas connection string.
2. In PowerShell, create the server environment file and install the API dependencies:

   ```powershell
   Copy-Item server\.env.example server\.env
   Set-Location server
   npm install
   npm start
   ```

3. Before starting the API, edit `server\.env` and set a private `MONGO_URI`, a long random `JWT_SECRET`, and unique `ADMIN_EMAIL` / `ADMIN_PASSWORD` values.
4. In a second terminal, install and start the React app:

   ```powershell
   Set-Location client
   npm install
   npm run dev
   ```

5. Open the Vite URL shown in the terminal. The owner dashboard is at `/admin`.

The Vite development server proxies `/api` and `/uploads` to the API on port `5000`.

## Deploy as one service

The Express API can serve the production React build, so the website, admin dashboard, API, and uploaded images use the same domain.

1. Create a MongoDB Atlas cluster and database user. Add the deployment service's outbound IP addresses to the Atlas network access list. Use a private database password.
2. Create a **Node web service** from this repository on your hosting provider, with the repository root as the service root.
3. Configure the service commands:

   - Build: `cd client && npm ci && npm run build && cd ../server && npm ci`
   - Start: `npm --prefix server start`

4. Configure these environment variables in the hosting dashboard:

   - `MONGO_URI`: the Atlas connection string for this database.
   - `JWT_SECRET`: a randomly generated secret with at least 32 characters.
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD`: private owner login credentials.
   - `UPLOADS_DIR`: the path to a persistent disk directory, for example `/var/data/uploads`.
5. Attach a persistent disk to the web service and mount it at `/var/data` (matching the example above). Car photos are saved there and remain available across deploys and restarts.
6. Deploy, then open the service URL. Sign in at `/admin`; no separate frontend service or API URL is needed.

Set the upload directory to the provider's persistent disk path. Without persistent storage, uploaded photos may be lost when the service restarts or redeploys. Keep `server/.env` and production credentials out of source control.

## Photo gallery

The public gallery is available at `/gallery`. Sign in to `/admin`, open the **Gallery** tab, choose up to 8 JPG, PNG, or WebP photos (5 MB each), and optionally add a caption for the batch. Uploaded photos appear in the public gallery; owners can remove them from the same admin tab. Gallery photos use the same persistent `UPLOADS_DIR` storage as car listing photos.

## Brand logos

Sign in to `/admin` and open the **Brands** tab to add or remove brand logos. Each logo can be a JPG, PNG, or WebP image up to 5 MB. Published logos appear in a continuously scrolling strip on the landing page and use the same persistent `UPLOADS_DIR` storage as car and gallery images.

## Dealership details

Update `client/src/config.js` with the dealership's WhatsApp number (digits only, including the country code), phone number, and Facebook/Instagram profile URLs. The address, directions link, and map coordinates are configured there as well.

The example `.env` values are for local setup only. Set private credentials before running the API; do not commit `server/.env`.
