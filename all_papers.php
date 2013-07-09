<?php

$res = [];

foreach (GLOB("papers/*-*-*") as $filename) {
    $id = explode('/', $filename)[1];
    $res[$id] = preg_split("/\n/", file_get_contents($filename), -1, PREG_SPLIT_NO_EMPTY);
}

print json_encode($res);

// var_dump($res);
