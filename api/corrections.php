<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

$dataFile = __DIR__ . DIRECTORY_SEPARATOR . 'corrections.json';
$password = '5822';

function reply($status, $payload) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function read_items($file) {
    if (!file_exists($file)) return array();
    $items = json_decode(file_get_contents($file), true);
    return is_array($items) ? $items : array();
}

function write_items($file, $items) {
    $written = file_put_contents($file, json_encode($items, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), LOCK_EX);
    if ($written === false) reply(500, array('error' => '纠错记录保存失败，请检查 api 目录写入权限'));
}

try {
    $items = read_items($dataFile);
    if ($_SERVER['REQUEST_METHOD'] === 'GET') reply(200, array('items' => $items));
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') reply(405, array('error' => '不支持的请求方式'));

    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) reply(400, array('error' => '请求内容格式错误'));
    $action = isset($input['action']) ? $input['action'] : '';

    if ($action === 'create') {
        $submitter = trim(isset($input['submitter']) ? $input['submitter'] : '');
        $content = trim(isset($input['content']) ? $input['content'] : '');
        if ($submitter === '' || $content === '') reply(400, array('error' => '提交人姓名和纠错内容不能为空'));
        $captcha = trim(isset($input['captcha']) ? $input['captcha'] : '');
        if (!isset($_SESSION['correction_captcha']) || $captcha !== (string) $_SESSION['correction_captcha']) reply(400, array('error' => '验证码错误，请重新计算'));
        unset($_SESSION['correction_captcha']);
        $item = array(
            'id' => uniqid('', true),
            'submitter' => $submitter,
            'content' => $content,
            'submittedAt' => date('Y-m-d H:i:s'),
            'status' => 'pending'
        );
        array_unshift($items, $item);
        write_items($dataFile, $items);
        reply(201, array('item' => $item));
    }

    if ($action !== 'update' && $action !== 'delete') reply(400, array('error' => '无效的操作'));
    if (!isset($input['password']) || $input['password'] !== $password) reply(403, array('error' => '操作密码错误'));
    $id = isset($input['id']) ? $input['id'] : '';
    $found = false;
    foreach ($items as $index => $item) {
        if ($item['id'] !== $id) continue;
        $found = true;
        if ($action === 'delete') {
            array_splice($items, $index, 1);
            write_items($dataFile, $items);
            reply(200, array('ok' => true));
        }
        $status = isset($input['status']) ? $input['status'] : '';
        if ($status !== 'archived' && $status !== 'repaired') reply(400, array('error' => '无效的记录状态'));
        $items[$index]['status'] = $status;
        write_items($dataFile, $items);
        reply(200, array('item' => $items[$index]));
    }
    if (!$found) reply(404, array('error' => '没有找到对应的纠错记录'));
} catch (Exception $error) {
    reply(500, array('error' => '纠错接口异常，请稍后重试'));
}
