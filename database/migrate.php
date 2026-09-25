<?php
// Additive migration for the existing Co-StudyMaxx schema; never drops or rewrites a row.
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
$config=require dirname(__DIR__).'/server/config.local.php';
$migrationDsn=getenv('CSM_MIGRATION_DSN');$migrationUser=getenv('CSM_MIGRATION_USER');$migrationPassword=getenv('CSM_MIGRATION_PASSWORD');
$dsn=$migrationDsn===false?$config['dsn']:$migrationDsn;$dbUser=$migrationUser===false?$config['user']:$migrationUser;
$dbPassword=$migrationPassword===false?$config['password']:($migrationPassword==='__EMPTY__'?'':$migrationPassword);
try{$db=new PDO($dsn,$dbUser,$dbPassword,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);}
catch(Throwable $error){fwrite(STDERR,"Could not connect to MySQL with the configured migration credentials.\n");exit(1);}
$tables=$db->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
foreach(['users','decks','cards','documents'] as $required) if(!in_array($required,$tables,true)){fwrite(STDERR,"Expected existing table '$required'; use schema.sql only for a new empty database.\n");exit(1);}
if(!in_array('password_reset_tokens',$tables,true)){
    $db->exec("CREATE TABLE password_reset_tokens (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,user_id CHAR(32) NOT NULL,token_hash CHAR(64) NOT NULL UNIQUE,expires_at DATETIME(3) NOT NULL,used_at DATETIME(3) NULL,created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),INDEX(user_id,used_at,created_at),INDEX(expires_at,used_at),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Created password reset token storage.\n";
}
$columns=array_column($db->query('SHOW COLUMNS FROM users')->fetchAll(),'Field');
if(!in_array('email',$columns,true)){ $db->exec('ALTER TABLE users ADD COLUMN email VARCHAR(254) NULL UNIQUE AFTER username'); echo "Added nullable unique email; existing usernames/password hashes were preserved.\n"; }
$columns=array_column($db->query('SHOW COLUMNS FROM documents')->fetchAll(),'Field');
if(!in_array('user_id',$columns,true)){
    $db->exec('ALTER TABLE documents ADD COLUMN user_id CHAR(32) NULL AFTER id');
    $db->exec('UPDATE documents m JOIN decks d ON d.id=m.deck_id SET m.user_id=d.user_id WHERE m.user_id IS NULL');
    $db->exec('ALTER TABLE documents MODIFY user_id CHAR(32) NOT NULL, ADD INDEX idx_documents_user_created(user_id,created_at), ADD CONSTRAINT fk_documents_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE');
    echo "Backfilled material ownership from each parent deck; existing PDF metadata and IDs were preserved.\n";
}
if(!in_array('bombcard_progress',$tables,true)){
    $db->exec("CREATE TABLE bombcard_progress (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,user_id CHAR(32) NOT NULL,bombcard_id CHAR(32) NOT NULL,status ENUM('new','learning','known') NOT NULL DEFAULT 'new',times_seen INT UNSIGNED NOT NULL DEFAULT 0,times_known INT UNSIGNED NOT NULL DEFAULT 0,times_unknown INT UNSIGNED NOT NULL DEFAULT 0,last_reviewed_at DATETIME(3) NULL,created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),UNIQUE(user_id,bombcard_id),INDEX(user_id,status),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(bombcard_id) REFERENCES cards(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Created per-user Bombcard progress. Existing cards, sessions, results, and notes were preserved.\n";
}
$highlightTables=$db->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
if(in_array('highlights',$highlightTables,true)){
    $columns=array_column($db->query('SHOW COLUMNS FROM highlights')->fetchAll(),'Field');
    if(!in_array('purpose',$columns,true)){$db->exec("ALTER TABLE highlights ADD COLUMN purpose VARCHAR(16) NOT NULL DEFAULT 'note'");echo "Added highlight purpose metadata.\n";}
    if(!in_array('selection_json',$columns,true)){$db->exec('ALTER TABLE highlights ADD COLUMN selection_json LONGTEXT NULL');echo "Added persisted PDF selection geometry.\n";}
    if(!in_array('card_id',$columns,true)){$db->exec('ALTER TABLE highlights ADD COLUMN card_id CHAR(32) NULL');echo "Added source Bombcard link for highlights.\n";}
    $indexes=$db->query('SHOW INDEX FROM highlights')->fetchAll();
    if(!in_array('idx_highlights_card',array_column($indexes,'Key_name'),true))$db->exec('ALTER TABLE highlights ADD INDEX idx_highlights_card(card_id)');
    $foreign=$db->query("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='highlights' AND COLUMN_NAME='card_id' AND REFERENCED_TABLE_NAME='cards'")->fetchColumn();
    if(!$foreign)$db->exec('ALTER TABLE highlights ADD CONSTRAINT fk_highlights_card FOREIGN KEY(card_id) REFERENCES cards(id) ON DELETE SET NULL');
}
echo "Migration complete. No tables or existing user data were dropped.\n";
