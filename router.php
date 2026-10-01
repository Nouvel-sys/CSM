<?php
$path=rawurldecode(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));
if (preg_match('~(?:^|/)(?:\.|server|classes|database|tests|docs|test-results|storage)(?:[^/]*)(?:/|$)~i',$path)
    || preg_match('~\.(?:sql|log|md|py)$~i',$path) || str_contains($path,'..')) { http_response_code(404); exit; }
if (preg_match('~/(?:CSM/)?shared/deck/([a-zA-Z0-9_-]+)/?$~i',$path,$m)) {
    $_GET['share_token']=$m[1];
    require __DIR__.'/shared.html';
    return true;
}
if ($path==='/') { readfile(__DIR__.'/index.html'); return true; }
return false;
