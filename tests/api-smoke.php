<?php
declare(strict_types=1);
// Run against the local PHP server: php tests/api-smoke.php
$base = getenv('CSM_TEST_URL') ?: 'http://127.0.0.1:8080/api/index.php?r=';
$suffix = bin2hex(random_bytes(4));
$users = [
    ['name' => 'qa'.$suffix, 'email' => 'qa'.$suffix.'@example.invalid', 'password' => 'SmokeTest-2026!'],
    ['name' => 'qb'.$suffix, 'email' => 'qb'.$suffix.'@example.invalid', 'password' => 'SmokeTest-2026!'],
];
function check(bool $ok, string $message): void { if (!$ok) throw new RuntimeException($message); }
function client(): array { return ['cookie' => tempnam(sys_get_temp_dir(), 'csm-cookie-'), 'csrf' => '']; }
function call_api(array &$client, string $route, string $method='GET', ?array $data=null, ?string $upload=null): array {
    global $base;
    $ch=curl_init($base.$route);$headers=['Accept: application/json'];
    curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_COOKIEFILE=>$client['cookie'],CURLOPT_COOKIEJAR=>$client['cookie'],CURLOPT_CUSTOMREQUEST=>$method]);
    if($data!==null){if($upload!==null){$data['file']=new CURLFile($upload,'application/pdf','smoke-test.pdf');curl_setopt($ch,CURLOPT_POSTFIELDS,$data);}else{$headers[]='Content-Type: application/json';curl_setopt($ch,CURLOPT_POSTFIELDS,json_encode($data,JSON_THROW_ON_ERROR));}}
    if($method!=='GET'&&$client['csrf']!=='')$headers[]='X-CSRF-Token: '.$client['csrf'];
    curl_setopt($ch,CURLOPT_HTTPHEADER,$headers);$body=curl_exec($ch);$status=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);$error=curl_error($ch);curl_close($ch);
    if($body===false)throw new RuntimeException('HTTP client error: '.$error);
    $decoded=json_decode($body,true);if(is_array($decoded)&&isset($decoded['csrf']))$client['csrf']=$decoded['csrf'];
    return [$status,$decoded,$body];
}
function expect(array &$client,string $route,string $method='GET',?array $data=null,int $status=200,?string $upload=null):array{$result=call_api($client,$route,$method,$data,$upload);check($result[0]===$status,"$route expected HTTP $status, got {$result[0]}: {$result[2]}");return $result[1]??[];}
$created=[];$accounts=[];$tmpPdf=null;
try {
    $guard=client();expect($guard,'auth/session');$guard['csrf']='';expect($guard,'auth/logout','POST',[],403);
    foreach($users as $u){$c=client();expect($c,'auth/session');expect($c,'auth/register','POST',['username'=>$u['name'],'email'=>$u['email'],'password'=>$u['password']],201);expect($c,'auth/login','POST',['username'=>$u['name'],'password'=>'incorrect-password'],401);expect($c,'auth/login','POST',['username'=>$u['name'],'password'=>$u['password']]);$accounts[]=$c;}
    $a=$accounts[0];$b=$accounts[1];
    $freshWorkspace=expect($a,'workspace');$freshStats=$freshWorkspace['stats'];
    check($freshStats['decks']===0&&$freshStats['cards']===0&&$freshStats['studyDays']===0&&$freshStats['studyBestDays']===0&&$freshStats['accuracy']===0&&$freshStats['decksTrend']===0&&$freshStats['cardsTrend']===0&&$freshStats['accuracyTrend']===0,'A newly created account did not start with zero statistics.');
    check(count($freshStats['activityChart'])===7&&array_sum(array_column($freshStats['activityChart'],'current'))===0&&array_sum(array_column($freshStats['activityChart'],'previous'))===0,'A new account received non-zero sample activity.');
    expect($a,'auth/register','POST',['username'=>'duplicate'.$suffix,'email'=>$users[0]['email'],'password'=>$users[0]['password']],409);
    $profile=expect($a,'profile','PATCH',['displayName'=>'Smoke Profile '.$suffix,'avatar'=>'mint']);check($profile['avatar']==='mint','Profile avatar was not saved.');
    $deck=expect($a,'decks','POST',['title'=>'Smoke Reviewer '.$suffix,'subject'=>'QA','category'=>'Recent'],201);$deckId=$deck['id'];$created[]=$deckId;
    $deck=expect($a,'decks','PATCH',['id'=>$deckId,'title'=>'Smoke Reviewer Edited '.$suffix,'subject'=>'QA Edited','category'=>'Recent','cards'=>[]]);
    $card=expect($a,'cards','POST',['deckId'=>$deckId,'type'=>'IDENTIFICATION','prompt'=>'Smoke question?','correctAnswer'=>'Persistent answer','hint'=>'QA'],201);
    check(isset($card['id']),'Card was not created.');
    expect($a,'cards','PATCH',['deckId'=>$deckId,'id'=>$card['id'],'type'=>'IDENTIFICATION','prompt'=>'Edited smoke question?','correctAnswer'=>'Persistent answer','hint'=>'QA edited']);
    $removed=expect($a,'cards','POST',['deckId'=>$deckId,'type'=>'IDENTIFICATION','prompt'=>'Temporary card','correctAnswer'=>'Remove me'],201);
    expect($a,'cards','DELETE',['deckId'=>$deckId,'id'=>$removed['id']]);
    $card2=expect($a,'cards','POST',['deckId'=>$deckId,'type'=>'IDENTIFICATION','prompt'=>'Second smoke question?','correctAnswer'=>'Answer two'],201);
    $tmpPdf=tempnam(sys_get_temp_dir(),'csm-pdf-');file_put_contents($tmpPdf,"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
    $doc=expect($a,'documents','POST',['deckId'=>$deckId],201,$tmpPdf);check(isset($doc['id']),'PDF metadata was not saved.');
    $deck=expect($a,'decks&id='.$deckId);check(count($deck['cards'])===2&&count($deck['documents'])===1,'Deck read did not return saved cards and material metadata.');
    $stream=call_api($a,'documents/file&id='.$doc['id']);check($stream[0]===200&&str_starts_with($stream[2],'%PDF-'),'PDF owner could not read their own upload.');
    $highlight=expect($a,'highlights','POST',['documentId'=>$doc['id'],'page'=>1,'text'=>'Selected PDF passage','color'=>'#f5a23a','selection'=>[['x'=>0.12,'y'=>0.24,'width'=>0.31,'height'=>0.025]]],201);
    $savedHighlights=expect($a,'highlights&documentId='.$doc['id']);check(count($savedHighlights)===1&&$savedHighlights[0]['selection'][0]['x']===0.12,'PDF note selection geometry did not persist.');
    $session=expect($a,'arena/start','POST',['deckId'=>$deckId,'difficulty'=>'normal'],201);check($session['startingSeconds']===45,'Normal difficulty did not start at 45 seconds.');
    $answer=expect($a,'arena/answer','POST',['id'=>$session['id'],'position'=>0,'result'=>'wrong']);check($answer['answers'][0]['adjustment']===-5,'Wrong answer did not subtract exactly 5 seconds.');
    $duplicate=expect($a,'arena/answer','POST',['id'=>$session['id'],'position'=>0,'result'=>'correct']);check($duplicate['answers'][0]['adjustment']===-5,'A repeated submission changed the saved answer.');
    $answer=expect($a,'arena/answer','POST',['id'=>$session['id'],'position'=>1,'result'=>'correct']);check($answer['answers'][1]['adjustment']===8&&$answer['status']==='completed'&&$answer['remainingMs']>45000,'Correct answer did not award +8 seconds to the existing timer and finish the round.');
    foreach(['easy'=>60,'hard'=>30] as $difficulty=>$seconds){$other=expect($a,'arena/start','POST',['deckId'=>$deckId,'difficulty'=>$difficulty],201);check($other['startingSeconds']===$seconds,"$difficulty starting time is not $seconds seconds.");expect($a,'arena/abandon','POST',['id'=>$other['id']]);}
    $work=expect($a,'workspace');check(count(array_filter($work['decks'],fn($d)=>$d['id']===$deckId))===1,'Created deck disappeared on refresh.');check(count($work['sessions'])===3,'Arena results are missing from persisted history.');check(count($work['studyProgress'])===2,'Arena answers did not save per-card progress.');
    $fromHighlight=expect($a,'highlights/card','POST',['documentId'=>$doc['id'],'page'=>1,'text'=>'Selected answer passage','counterpart'=>'What is the PDF excerpt about?','purpose'=>'answer','color'=>'#8dc7ef','selection'=>[['x'=>0.2,'y'=>0.4,'width'=>0.2,'height'=>0.03]]],201);
    $deckAfterHighlightCard=expect($a,'decks&id='.$deckId);$sourceHighlight=array_values(array_filter(expect($a,'highlights&documentId='.$doc['id']),fn($item)=>$item['cardId']===$fromHighlight['cardId']));
    check(count($sourceHighlight)===1&&$sourceHighlight[0]['purpose']==='answer','PDF-created Bombcard was not linked to its source highlight.');
    check(count($deckAfterHighlightCard['cards'])===3&&$deckAfterHighlightCard['cards'][2]['prompt']==='What is the PDF excerpt about?'&&$deckAfterHighlightCard['cards'][2]['correctAnswer']==='Selected answer passage','Answer-selected excerpt did not create the correct Bombcard pair.');
    $answerSource=array_values(array_filter(expect($a,'highlights&documentId='.$doc['id']),fn($item)=>$item['cardId']===$fromHighlight['cardId']));check(count($answerSource)===1&&$answerSource[0]['purpose']==='answer','PDF-created answer Bombcard lost its source highlight metadata.');
    $questionFromHighlight=expect($a,'highlights/card','POST',['documentId'=>$doc['id'],'page'=>1,'text'=>'What is the PDF excerpt about?','counterpart'=>'Cellular energy production','purpose'=>'question','color'=>'#f5a23a','selection'=>[['x'=>0.4,'y'=>0.55,'width'=>0.25,'height'=>0.03]]],201);
    $deckAfterQuestionCard=expect($a,'decks&id='.$deckId);check(count($deckAfterQuestionCard['cards'])===4&&$deckAfterQuestionCard['cards'][3]['prompt']==='What is the PDF excerpt about?'&&$deckAfterQuestionCard['cards'][3]['correctAnswer']==='Cellular energy production','Question-selected excerpt did not create the correct Bombcard pair.');
    $foreign=client();expect($foreign,'auth/session');expect($foreign,'auth/login','POST',['username'=>$users[1]['name'],'password'=>$users[1]['password']]);
    expect($foreign,'decks&id='.$deckId,'GET',null,404);
    expect($foreign,'cards','POST',['deckId'=>$deckId,'prompt'=>'unauthorized','correctAnswer'=>'no','type'=>'IDENTIFICATION'],404);
    expect($foreign,'documents/file&id='.$doc['id'],'GET',null,404);
    expect($foreign,'highlights&documentId='.$doc['id'],'GET',null,404);
    expect($foreign,'highlights/card','POST',['documentId'=>$doc['id'],'page'=>1,'text'=>'Private excerpt','counterpart'=>'Private question','purpose'=>'answer','color'=>'#f5a23a','selection'=>[['x'=>0.1,'y'=>0.1,'width'=>0.1,'height'=>0.02]]],404);
    expect($foreign,'documents','DELETE',['id'=>$doc['id']],404);
    expect($foreign,'study/progress','POST',['bombcardId'=>$card['id'],'result'=>'known'],404);
    expect($foreign,'arena/session&id='.$session['id'],'GET',null,404);
    expect($a,'auth/password','POST',['currentPassword'=>$users[0]['password'],'newPassword'=>'SmokeChanged-2026!']);
    expect($a,'auth/logout','POST',[]);
    expect($a,'auth/session');expect($a,'auth/login','POST',['username'=>$users[0]['email'],'password'=>'SmokeChanged-2026!']);
    $again=expect($a,'workspace');check(count(array_filter($again['decks'],fn($d)=>$d['id']===$deckId))===1,'Data did not survive sign-out and sign-in.');
    expect($a,'decks','DELETE',['id'=>$deckId]);$created=[];
    echo "PASS register/login/invalid login/duplicate email; reviewer create/edit; Bombcard create/update; PDF upload/private read; PDF highlight persistence/page geometry; create both question/answer Bombcards from PDF selections; Easy/Normal/Hard timer starts; wrong -5/correct +8/idempotent answers; per-card progress; saved history/refresh/sign-out/sign-in; cross-account ownership isolation; QA cleanup.\n";
} finally {
    if($tmpPdf&&is_file($tmpPdf))unlink($tmpPdf);
    foreach($created as $deckId){try{if(isset($a))expect($a,'decks','DELETE',['id'=>$deckId]);}catch(Throwable $ignored){}}
    try {$cfg=require dirname(__DIR__).'/server/config.local.php';$pdo=new PDO($cfg['dsn'],$cfg['user'],$cfg['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);$delete=$pdo->prepare('DELETE FROM users WHERE username=?');foreach($users as $u)$delete->execute([$u['name']]);}catch(Throwable $ignored){}
    foreach($accounts as $c){if(is_file($c['cookie']))unlink($c['cookie']);}
}
