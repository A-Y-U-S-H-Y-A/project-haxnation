Check if there is any hidden data inside the image file using stegseek. It shows that the image requires passphrase for extraction which is not provided. (stegseek --seed chall.jpg) <br />
For cracking the passphrase we can use the rockyou wordlist (stegseek chall.jpg rockyou.txt) [Github Link for Rock you](https://github.com/brannondorsey/naive-hashcat/releases/download/data/rockyou.txt) <br />