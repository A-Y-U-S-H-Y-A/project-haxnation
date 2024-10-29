<?php
// Start the session
session_start();

// MySQL connection setup
$servername = "localhost";
$username = "your_username";
$password = "your_password";
$database = "your_database";

$conn = new mysqli($servername, $username, $password, $dbname);

// Check the database connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Check if a cookie exists
if (isset($_COOKIE['username'])) {
    $loggedInUser = $_COOKIE['username'];
    
    // SQL query directly including user input (vulnerable to SQLi)
    $sql = "SELECT * FROM usernames WHERE username = '$loggedInUser'";
    $result = $conn->query($sql);
    
    if ($result->num_rows > 0) {
        echo "Good Job! HXN{IkN0WH@c!ng}";
    } else {
        echo "Not Exists";
    }
} else {
    // If there is no cookie and it's a GET request, show login form
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo '<form method="POST">
                <label for="username">Username:</label>
                <input type="text" id="username" name="username" required><br>
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required><br>
                <input type="submit" value="Login">
              </form> <!-- Do not brute force, use admin:admin or john:doe --> ';
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Process POST login attempt
        $username = $_POST['username'];
        $password = $_POST['password'];

        // Check if login details are correct
        if (($username === 'admin' && $password === 'admin') || ($username === 'john' && $password === 'doe')) {
            // Set a cookie for the user
            setcookie('username', $username, time() + (86400 * 30), "/"); // 1-day expiration
            
            // SQL query directly including user input (vulnerable to SQLi)
            $sql = "SELECT * FROM usernames WHERE username = '$username'";
            $result = $conn->query($sql);

            if ($result->num_rows > 0) {
                echo "Good Job! HXN{IkN0WH@c!ng}";
            } else {
                echo "The user is valid but does not have a flag";
            }
        } else {
            echo "Invalid login credentials";
        }
    }
}

// Close the database connection
$conn->close();
?>
