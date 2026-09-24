<?php
final class StudyProgress {
    public function __construct(private Database $db) {}
    public function record(string $user,string $card,string $result): void {
        if(!in_array($result,['seen','known','unknown'],true))fail(422,'Invalid study progress value.');
        $known=(int)($result==='known');$unknown=(int)($result==='unknown');
        $this->db->query("INSERT INTO bombcard_progress (user_id,bombcard_id,times_seen,times_known,times_unknown,status,last_reviewed_at)
            SELECT ?,c.id,1,?,?,IF(?=1,'known','learning'),CURRENT_TIMESTAMP(3) FROM cards c JOIN decks d ON d.id=c.deck_id WHERE c.id=? AND d.user_id=?
            ON DUPLICATE KEY UPDATE times_seen=times_seen+1,times_known=times_known+VALUES(times_known),times_unknown=times_unknown+VALUES(times_unknown),last_reviewed_at=VALUES(last_reviewed_at),status=IF(times_unknown>times_known,'learning',IF(times_known>0,'known','learning'))",
            [$user,$known,$unknown,$known,$card,$user]);
    }
    public function forUser(string $user): array {
        return $this->db->query('SELECT p.*,c.deck_id FROM bombcard_progress p JOIN cards c ON c.id=p.bombcard_id JOIN decks d ON d.id=c.deck_id WHERE p.user_id=? AND d.user_id=? ORDER BY p.last_reviewed_at DESC',[$user,$user])->fetchAll();
    }
}
