<?php
return [
    'dsn'=>'mysql:host=127.0.0.1;port=3306;dbname=co_studymaxx;charset=utf8mb4',
    'user'=>'csm_app',
    'password'=>'replace-with-a-long-local-password',
    'upload_dir'=>dirname(__DIR__,2).'/csm-private-uploads', // outside the document root
    'max_upload_bytes'=>10*1024*1024,
    'secure_cookie'=>false, // true for HTTPS
    'app_env'=>getenv('APP_ENV')?:'local',
    'app_base_url'=>getenv('APP_BASE_URL')?:'http://127.0.0.1:8080', // trusted public app URL; never derived from Host
    'mailer_url'=>getenv('CSM_MAILER_URL')?:'http://127.0.0.1:8091/send', // localhost-only Nodemailer bridge
    'mailer_secret'=>getenv('CSM_MAILER_SECRET')?:'replace-with-the-same-random-64-character-secret-as-mailer-env',
];
