# Co-StudyMaxx local setup (PHP + MySQL)

The frontend remains the existing React/Babel app. Its authentication and persistent workspace data are served by the OOP PHP/PDO API in `api/`, `server/`, and `classes/`; MySQL is the source of truth. This project does not use Gemini or generated AI content.

## XAMPP setup

1. Install/start Apache and MySQL in XAMPP. The app uses PHP 8+, PDO MySQL, `mbstring`, and `fileinfo` (included in the XAMPP PHP build).
2. Create a local database named `co_studymaxx` with `utf8mb4` collation. For a new empty database, import `database/schema.sql` using phpMyAdmin’s **Import** tab or `mysql -u root -p co_studymaxx < database/schema.sql`.
3. Create a least-privilege application user in MySQL. Grant `SELECT, INSERT, UPDATE, DELETE` on `co_studymaxx.*`; the application does not need DDL permissions at runtime.
4. Copy `server/config.example.php` to `server/config.local.php` and set a strong unique local password, database host/name, and a private upload directory. Keep `secure_cookie` false only for local HTTP; enable it behind HTTPS. `config.local.php` is ignored by Git.
5. For an existing Co-StudyMaxx database, back it up first, then run the additive migration with a database account temporarily allowed to alter the schema:

   ```powershell
   C:\xampp\mysql\bin\mysqldump.exe -u root -p co_studymaxx > co_studymaxx-backup.sql
   C:\xampp\php\php.exe database\migrate.php
   ```

   `database/migrate.php` reads `server/config.local.php` by default. For a one-time migration, you can override its connection using `CSM_MIGRATION_DSN`, `CSM_MIGRATION_USER`, and `CSM_MIGRATION_PASSWORD` environment variables (`__EMPTY__` represents an intentionally empty password), or temporarily grant its configured DB user the DDL permissions needed for the additive `ALTER`/`CREATE` statements. The migration adds nullable email data and password-reset token storage, scopes existing PDF metadata to its deck owner, adds per-Bombcard study progress, and adds PDF highlight purpose/position metadata plus a source-Bombcard link. It does not delete or rewrite existing account, reviewer, card, activity, Arena, or highlight text rows. Revoke temporary DDL access afterward; runtime only needs `SELECT, INSERT, UPDATE, DELETE`.
6. Either put the project under XAMPP’s `htdocs` and browse to it through Apache, or from this folder start the PHP development server:

   ```powershell
   C:\xampp\php\php.exe -d upload_max_filesize=10M -d post_max_size=12M -S 127.0.0.1:8080 router.php
   ```

   Then open `http://127.0.0.1:8080/`. `package.json` keeps `npm start`/`npm run serve` mapped to the PHP server. In Windows PowerShell, use `npm.cmd start` or `npm.cmd run serve` (PowerShell may block the `npm.ps1` shim under restrictive execution policies). Node is needed only for password-recovery email delivery; the rest of the app continues to run directly on PHP. Do not use VS Code Live Server or another static-only server; it cannot execute `api/index.php`.

## Password recovery mail service

PHP continues to issue, hash, validate, expire, and consume reset tokens. A small Nodemailer bridge only sends the email; it binds to `127.0.0.1` and accepts requests only with a shared secret. The application uses the configured `APP_BASE_URL` to create reset links and never trusts the request Host header.

1. Install Node.js (LTS, version 20 or newer) on the machine that runs PHP, then from the repository root run `npm install` (`npm.cmd install` in Windows PowerShell).
2. Copy `mailer/.env.example` to `mailer/.env`. Generate a private shared secret with `C:\xampp\php\php.exe -r "echo bin2hex(random_bytes(32)), PHP_EOL;"` (or `php -r ...` where PHP is on PATH). Put the same generated value in `mailer/.env` as `CSM_MAILER_SECRET` and in `server/config.local.php` as `mailer_secret`. Never commit either local file.
3. Set `APP_BASE_URL` identically in the PHP configuration and `mailer/.env`, e.g. `http://127.0.0.1:8080` for local PHP development or `http://localhost/CSM` under local XAMPP Apache. Set `mailer_url` in `server/config.local.php` to `http://127.0.0.1:8091/send`. The URL is configured explicitly and is not constructed from incoming requests.
4. For real email delivery, set `MAILER_TRANSPORT=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURITY` (`implicit`, `starttls`, or `none` for local-only testing), `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` in `mailer/.env`. Recovery is not considered configured until both services have a valid base URL and matching secret and all SMTP fields are supplied. Do not use `none` in production. In production set `APP_ENV=production`, `NODE_ENV=production`, use an HTTPS `APP_BASE_URL`, and set PHP `secure_cookie` to `true` behind HTTPS.
5. Start the Node bridge in a second terminal with `npm run mailer` (`npm.cmd run mailer` in Windows PowerShell), then start PHP as above (or start XAMPP Apache). The public website and existing `npm start`/`serve` behavior remain PHP-only. Keep the mail service on the same host as PHP; do not expose its port to the network.

The bridge reports `not configured` on `/health` until its settings are complete. Recovery requests always return the same confirmation for known and unknown email addresses; SMTP sending is started after the local bridge acknowledges the request to reduce timing-based account discovery. Reset links expire after 30 minutes, are single-use, and newer requests invalidate previous links. Tokens are carried in the URL fragment (not sent in the initial page request or web-server access logs) and the reset page removes the fragment from visible history after reading it.

The PDF Study Tool uses a pinned Mozilla PDF.js build from cdnjs, so PDF rendering requires an internet connection. Text selection/highlighting is available for text-based PDFs; scanned image-only documents require OCR before text can be selected.

## Data and sample content

`database/schema.sql` is for an empty database only. For data already in the prior schema, run the migration, not the empty schema over that database. There is no automatic sample-data seeder: the old frontend’s sample decks were presentation mocks and are not copied into real accounts. The app now displays each signed-in account’s saved data. Existing users without email can continue signing in with username; an email is required when registering a new account. Browser-only legacy profile/activity data is not silently assigned to a server account; the login page offers a JSON export, while old plaintext browser credentials are removed.

Uploaded PDFs are stored outside the public project folder (default: a `csm-private-uploads` directory two levels above `server/`) under generated names. Back up that directory along with MySQL. Never place it under `htdocs` or the repository.

## Checks

With the PHP server running and `server/config.local.php` configured:

```powershell
C:\xampp\php\php.exe tests\api-smoke.php
```

For the recovery checks, copy `mailer/.env.example`, set a valid shared secret and matching local base URL, set `MAILER_TRANSPORT=stub`, and start `npm run mailer` (or `npm.cmd run mailer` in Windows PowerShell) in another terminal. The stub uses Nodemailer's JSON transport, keeps messages in memory, and does not contact SMTP. The smoke test creates temporary accounts and exercises registration/sign-in, reviewer/card/PDF/highlight/Arena persistence, cross-account isolation, generic reset responses, invalidated/invalid/expired/used tokens, password reset/sign-in, and revocation of existing sessions. QA users and their owned data are removed afterward.

## Current limits

- The legacy “share” action still produces a client-side share token and is not a server-authorized collaborator workflow. Private data is never exposed by that token. Sharing needs a product decision on roles and revocation before it can be made real.
- The PDF viewer can serve an owned PDF securely, and notes are stored per document, but the existing mock annotation UI is not a true text-selection/highlight editor.
- Privacy-policy text/links and account deletion are not implemented.
