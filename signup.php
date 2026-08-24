<?php
session_start();
header('Content-Type: application/json');
require 'config.php';

$data = json_decode(file_get_contents("php://input"), true);

$username = trim($data['username'] ?? '');
$password = $data['password'] ?? '';
$password2 = $data['password2'] ?? '';

if ($password !== $password2) {
    echo json_encode(['ok' => false, 'error' => 'Passwords do not match']);
    exit;
}

$hash = password_hash($password, PASSWORD_DEFAULT);

// insert user
$stmt = $pdo->prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
$stmt->execute([$username, $hash]);

$userId = $pdo->lastInsertId();

// auto create progress
$stmt = $pdo->prepare("INSERT INTO player_progress (user_id) VALUES (?)");
$stmt->execute([$userId]);

$_SESSION['user_id'] = $userId;
$_SESSION['username'] = $username;

echo json_encode(['ok' => true]);