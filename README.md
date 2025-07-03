# Backend Example

This is a simple Express server for image comparison and preset management.
Camera profiles are stored in a MySQL database.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and adjust values if necessary. The main variables are:
   - `DB_HOST` (default `localhost`)
   - `DB_PORT` (default `3306`)
   - `DB_USER` (default `root`)
   - `DB_PASSWORD`
   - `DB_DATABASE` (default `imagedb`)
   - `PORT` (default `3000`)
3. Start the server:
   ```bash
   npm start
   ```

You can initialize the database with `schema.sql`.

The server will create a `camera_profiles` table if it does not exist.

