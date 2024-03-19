It has no extension so we can identify the file type using the 'file' command <br />
Unzip the file <br />
Use exiftool to get the metadata of the image file. <br />
We can see a password in the metadata which is base64 encoded. Decode it<br />
We can finally use the password to open the PDF which contains the flag<br />
