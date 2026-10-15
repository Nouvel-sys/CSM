<?php
final class Deck {
    public function __construct(private Database $db) {}
    public function owned(string $id,string $userId): ?array { return $this->db->query("SELECT * FROM decks WHERE id=? AND user_id=? AND moderation_status='visible'",[$id,$userId])->fetch() ?: null; }
    public function allForUser(string $userId): array { return $this->db->query("SELECT * FROM decks WHERE user_id=? AND moderation_status='visible' ORDER BY updated_at DESC",[$userId])->fetchAll(); }
    public function create(string $id,string $user,string $title,string $subject,string $category): void { $this->db->query('INSERT INTO decks (id,user_id,title,subject,category) VALUES (?,?,?,?,?)',[$id,$user,$title,$subject,$category]); }
    public function update(string $id,string $title,string $subject,string $category): void { $this->db->query('UPDATE decks SET title=?,subject=?,category=? WHERE id=?',[$title,$subject,$category,$id]); }
    public function delete(string $id,string $user): void { $this->db->query('DELETE FROM decks WHERE id=? AND user_id=?',[$id,$user]); }
}
