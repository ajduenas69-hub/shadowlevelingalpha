<?php
session_start();
header('Content-Type: application/json');
require 'config.php';

$data = json_decode(file_get_contents("php://input"), true);

$username = trim($data['username'] ?? '');
$password = $data['password'] ?? '';

$stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user) {
    echo json_encode(['ok' => false, 'error' => 'User not found']);
    exit;
}

if (!password_verify($password, $user['password_hash'])) {
    echo json_encode(['ok' => false, 'error' => 'Wrong password']);
    exit;
}

$_SESSION['user_id'] = $user['id'];
$_SESSION['username'] = $user['username'];

echo json_encode(['ok' => true]);