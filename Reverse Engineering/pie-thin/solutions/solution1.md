## Procedure
We are given an exe file that displays an encryption challenge. Opening it up in Ghidra or even running strings and spotting the certain names, we can figure out it’s a python file. <br/>
We use a tool called pyinstxtractor to extract into pyc files.<br/>
After extracting the pyc files, we realise that we cant use uncompyle6 or decompyle3 because of the python version. So we try check the main function of this exe which is usually main.pyc but in this case, it’s the name of the exe itself. <br/>
Runing Strings on that pyc file, we find some interesting stuff <br/> 
As the program told us to ignore the first two characters which are z! we put the rest into CyberChef with the Key mentioned and get our flag

## Solution by
- Ahtesham Ali Khan
