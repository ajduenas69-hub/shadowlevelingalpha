<?php
$DB_HOST = 'localhost';
$DB_NAME = 'shadowleveling';
$DB_USER = 'root';
$DB_PASS = ''; // palitan kung may password ka
$DB_CHARSET = 'utf8mb4';

$dsn = "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=$DB_CHARSET";

try {
    $pdo = new PDO($dsn, $DB_USER, $DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    die("DB ERROR: " . $e->getMessage());
}