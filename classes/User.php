<?php
final class User {
    public function __construct(private Database $db) {}
    public function find(string $id): ?array { return $this->db->query('SELECT id,username,email,password_hash,auth_version FROM users WHERE id=?',[$id])->fetch() ?: null; }
    public function byLogin(string $login): ?array { return $this->db->query('SELECT * FROM users WHERE username=? OR email=? LIMIT 1',[$login,$login])->fetch() ?: null; }
    public function register(string $id,string $username,string $email,string $hash): void {
        $this->db->transaction(function()use($id,$username,$email,$hash){
            $this->db->query('INSERT INTO users (id,username,email,password_hash) VALUES (?,?,?,?)',[$id,$username,$email,$hash]);
            $this->db->query('INSERT INTO profiles (user_id,display_name) VALUES (?,?)',[$id,$username]);
        });
    }
    public function setPassword(string $id,string $hash): void { $this->db->query('UPDATE users SET password_hash=?,auth_version=auth_version+1,locked_until=NULL WHERE id=?',[$hash,$id]); }
    public function profile(string $id): array {
        $row=$this->db->query('SELECT u.username,u.email,u.role,u.locked_until,p.* FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.id=?',[$id])->fetch();
        if(!$row)fail(404,'Account not found.');return ['username'=>$row['username'],'email'=>$row['email'],'role'=>$row['role'],'lockedUntil'=>$row['locked_until'],'displayName'=>$row['display_name'],'avatar'=>$row['avatar'],'nameChangedAt'=>timestamp_ms($row['name_changed_at'])];
    }
}
