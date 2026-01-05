# Jokiwi – PostgreSQL Migration & Vercel Deployment Guide

## Overview

Jokiwi is a Next.js application for managing tasks, orders and categories.  
It originally stored its data in a JSON file via **lowdb**.  
This fork refactors the data layer to use **PostgreSQL** so it can run on hosted platforms like **Vercel Postgres**.  
All CRUD functions in `lib/db.js` now operate against a PostgreSQL database using the `pg` client, and the JSON file has been removed.

## Database Migration Details

* **LowDB replaced by PostgreSQL** – The `lowdb` dependency and `db.json` file have been removed.  
  The new `lib/db.js` uses a `pg.Pool` to connect to the database.  Tables (`users`, `categories`, `orders`) are created automatically on first access.
* **Schema** – Each table uses an auto‑incrementing `SERIAL` primary key.  
  Foreign keys enforce relationships (`categories.user_id` → `users.id`, `orders.user_id` → `users.id`, `orders.category_id` → `categories.id`).  
  Additional columns mirror the previous JSON structure (e.g. `orders.category_name` is stored to avoid extra joins).
* **Seeding** – Running `npm run seed` will now **truncate** the three tables and **restart** their identity sequences before inserting sample data.  This is handled by `scripts/seed.js`, which calls `TRUNCATE orders, categories, users RESTART IDENTITY CASCADE` and then uses the exported CRUD functions to insert users, categories and orders.
* **Hashing** – Passwords are stored as bcrypt hashes.  The `verifyUserPassword` helper compares a supplied password to the stored hash.

## Local Development Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a PostgreSQL database** (local, Docker, or using a cloud provider like Vercel Postgres).  
   Obtain the connection string for your database.

3. **Create a `.env.local` file** in the project root and define the following variables:

   ```env
   # PostgreSQL connection string (required)
   POSTGRES_URL=postgres://<user>:<password>@<host>:<port>/<database>

   # Set to `true` if your database requires SSL (e.g. remote databases)
   POSTGRES_SSL=true

   # Secret used to sign JSON Web Tokens (used by lib/auth.js)
   JWT_SECRET=your-secret-for-jwt
   ```

   The Vercel Postgres integration and the `pg` library rely on a `POSTGRES_URL` environment variable.  
   Without this variable the application cannot connect to the database【818125039253531†L145-L169】.  
   For local development, you can create a database with Docker or a GUI and supply its credentials here.  When connecting with `pg`, the `connectionString` can simply read from `process.env.POSTGRES_URL`【924871430460617†L670-L683】.

4. **Seed the database (optional)**

   To populate the tables with sample users, categories and orders run:

   ```bash
   npm run seed
   ```

   This command will remove all existing data from the `users`, `categories` and `orders` tables and insert a small set of sample records.

5. **Run the development server**

   ```bash
   npm run dev
   ```

   The Next.js server will start on [http://localhost:3000](http://localhost:3000).  You can log in using the seeded accounts (`alice` / `password`, `bob` / `password`) or register new users.

## Deploying to Vercel

1. **Push your code to a Git repository** (GitHub, GitLab or Bitbucket).  
   If you cloned this repository locally, commit and push your changes.

2. **Import the project into Vercel** via the Vercel dashboard.  
   During the import you can add the **Postgres** integration from the Vercel Marketplace.  This provisioned database will automatically create environment variables such as `POSTGRES_URL` for your project.

3. **Verify environment variables**  
   In your project’s **Settings → Environment Variables** section, ensure that `POSTGRES_URL` is defined.  
   If Vercel displays an error that the connection string is missing, set `POSTGRES_URL` manually to the value provided by the Postgres integration【818125039253531†L145-L169】.  You should also define `JWT_SECRET` here for production.

4. **Deploy**  
   Click **Deploy** in Vercel.  Vercel will install dependencies (including `pg`), build the Next.js app and deploy it.  
   After deployment, navigate to your site’s URL.  If you need to seed the production database, you can run `npm run seed` locally using the production `POSTGRES_URL` (or execute equivalent `INSERT` statements via a SQL client).

## Vercel Postgres Notes

* **Pooling vs direct connections** – The Vercel Postgres integration exposes both `POSTGRES_URL` and `POSTGRES_URL_NON_POOLING`.  The code in this repository uses the pooled URL by default.  If you run into connection‑limit issues, you can switch to the non‑pooling URL by replacing `POSTGRES_URL` with `POSTGRES_URL_NON_POOLING` in your `.env`.
* **SSL** – Remote databases often require SSL.  The example from the Heroku documentation shows how to pass an `ssl` option when connecting with `pg`【924871430460617†L670-L683】.  In this code we enable SSL when `POSTGRES_SSL=true`.  If you are connecting to a local database without TLS, omit the variable or set it to `false`.
* **Environment variable sync** – After adding or changing environment variables in Vercel, use `vercel env pull .env.local` to update your local `.env.local` file, or manually replicate the values.

## Summary of Changes

* **Removed** the `lowdb` dependency and `db.json` file.
* **Added** the `pg` dependency and rewrote `lib/db.js` to initialise tables and perform CRUD operations using PostgreSQL.
* **Added** a `getPool` helper for administrative queries.
* **Updated** `scripts/seed.js` to truncate tables and seed sample data.
* **Added** this README with instructions for configuration and deployment.

With these changes the application is ready to run on both local PostgreSQL instances and Vercel’s managed Postgres.  Follow the steps above to configure your environment and deploy.