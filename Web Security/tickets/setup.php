<?php
// Database connection parameters
$servername = "localhost";
$username = "your_username";
$password = "your_password";
$database = "your_database";

try {
    // Create a new PDO connection
    $conn = new PDO("mysql:host=$servername;dbname=$database", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // SQL to create the table
    $createTableSQL = "CREATE TABLE IF NOT EXISTS usernames (
        username VARCHAR(255) NOT NULL
    )";
    $conn->exec($createTableSQL);
    echo "Table 'usernames' created successfully.<br>";

    // SQL to insert the entry
    $insertSQL = "INSERT INTO usernames (username) VALUES ('maybeihaveaticket')";
    $conn->exec($insertSQL);
    echo "Entry 'maybeihaveaticket' added to table 'usernames' successfully.";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}

// Close the connection
$conn = null;
?>
