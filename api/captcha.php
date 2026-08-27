<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

$left = mt_rand(1, 9);
$right = mt_rand(1, 9);
$_SESSION['correction_captcha'] = $left + $right;
echo json_encode(array('captcha' => $left . ' + ' . $right . ' = ?'), JSON_UNESCAPED_UNICODE);
