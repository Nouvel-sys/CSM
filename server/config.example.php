<?php
return [
    'dsn'=>'mysql:host=127.0.0.1;port=3306;dbname=co_studymaxx;charset=utf8mb4',
    'user'=>'csm_app',
    'password'=>'replace-with-a-long-local-password',
    'upload_dir'=>dirname(__DIR__,2).'/csm-private-uploads', // outside the document root
    'max_upload_bytes'=>10*1024*1024,
    'secure_cookie'=>false, // true for HTTPS
];
