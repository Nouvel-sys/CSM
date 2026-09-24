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

   `database/migrate.php` reads `server/config.local.php`, so temporarily grant its configured database user the DDL permissions needed for these additive `ALTER`/`CREATE` statements (or configure a dedicated migration user locally). The migration adds nullable email data, scopes existing PDF metadata to its deck owner, adds per-Bombcard study progress, and adds PDF highlight purpose/position metadata plus a source-Bombcard link. It does not delete or rewrite existing account, reviewer, card, activity, Arena, or highlight text rows. Revoke the temporary DDL grant afterward; runtime only needs `SELECT, INSERT, UPDATE, DELETE`.
6. Either put the project under XAMPP’s `htdocs` and browse to it through Apache, or from this folder start the PHP development server:

   ```powershell
   C:\xampp\php\php.exe -d upload_max_filesize=10M -d post_max_size=12M -S 127.0.0.1:8080 router.php
   ```

   Then open `http://127.0.0.1:8080/`. `package.json` also exposes the same PHP server command as `start`/`serve` for environments that already have npm; Node is not required to run the app directly with PHP. Do not use VS Code Live Server or another static-only server; it cannot execute `api/index.php`.

The PDF Study Tool uses a pinned Mozilla PDF.js build from cdnjs, so PDF rendering requires an internet connection. Text selection/highlighting is available for text-based PDFs; scanned image-only documents require OCR before text can be selected.

## Data and sample content

`database/schema.sql` is for an empty database only. For data already in the prior schema, run the migration, not the empty schema over that database. There is no automatic sample-data seeder: the old frontend’s sample decks were presentation mocks and are not copied into real accounts. The app now displays each signed-in account’s saved data. Existing users without email can continue signing in with username; an email is required when registering a new account. Browser-only legacy profile/activity data is not silently assigned to a server account; the login page offers a JSON export, while old plaintext browser credentials are removed.

Uploaded PDFs are stored outside the public project folder (default: a `csm-private-uploads` directory two levels above `server/`) under generated names. Back up that directory along with MySQL. Never place it under `htdocs` or the repository.

## Checks

With the PHP server running and `server/config.local.php` configured:

```powershell
C:\xampp\php\php.exe tests\api-smoke.php
```

The smoke test creates two unique temporary accounts and exercises registration/sign-in, reviewer create/edit, card creation, private PDF upload/read, a Normal Arena answer (+8 seconds), history after reload/sign-out/sign-in, and cross-account isolation. Its QA reviewer, PDF, and accounts are removed afterward.

## Current limits

- Password recovery by email is not available because this repository has no mail delivery service; signed-in users can change passwords after verifying the current password.
- The legacy “share” action still produces a client-side share token and is not a server-authorized collaborator workflow. Private data is never exposed by that token. Sharing needs a product decision on roles and revocation before it can be made real.
- The PDF viewer can serve an owned PDF securely, and notes are stored per document, but the existing mock annotation UI is not a true text-selection/highlight editor.
- Privacy-policy text/links and account deletion are not implemented.
