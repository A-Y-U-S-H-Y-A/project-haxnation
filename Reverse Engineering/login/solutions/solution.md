
# Solution: Login?

This challenge demonstrates the risks of storing sensitive information inside an unencrypted local SQLite database in an Android application.

## Prerequisites
* An Android emulator (like Android Studio Emulator, Genymotion, or Corellium) or a rooted physical device.
* Android Debug Bridge (`adb`) installed on your system.

## Step-by-Step Resolution

### Method 1: Dynamic Analysis via ADB (Recommended)

1. **Install the Application:**
   Install the provided `app-debug.apk` onto your emulator or device.
   ```bash
   adb install app-debug.apk
   ```

2. **Access the Device Shell:**
   Open a shell on the device using ADB. You may need root privileges (`su`) to access the application's private data directory.
   ```bash
   adb shell
   ```

3. **Navigate to the App's Database Directory:**
   Android applications typically store their SQLite databases in `/data/data/<package_name>/databases/` or `/data/user/0/<package_name>/databases/`.
   ```bash
   cd /data/user/0/com.example.loginapp/databases
   ls
   ```
   *You should see a file named `UserDB.db`.*

4. **Inspect the SQLite Database:**
   Use the built-in `sqlite3` command-line tool to interact with the database.
   ```bash
   sqlite3 UserDB.db
   ```

5. **Extract the Flag:**
   List the tables to see what data is available, and then query the `Users` table.
   ```sql
   sqlite> .tables
   Users  android_metadata
   
   sqlite> SELECT * FROM Users;
   1|admin|admin@haxnation.org|HXN{H!ddenSQLite}
   ```
   *The flag is located in the password/credential field of the admin user.*

### Method 2: Android Studio Device File Explorer
If you are running the app on a standard Android Studio emulator, you can bypass the command line:
1. Open Android Studio.
2. Go to **View > Tool Windows > Device File Explorer**.
3. Navigate to `data -> data -> com.example.loginapp -> databases`.
4. Right-click `UserDB.db` and select **Save As** to download it to your machine.
5. Open the downloaded `.db` file using a tool like **DB Browser for SQLite** to view the `Users` table and extract the flag.

## Flag
`HXN{H!ddenSQLite}`
