
def rotate(text, key):
    key = int(key)
    result = ""
    for char in text:
        if char.isalpha():
            offset = ord('A') if char.isupper() else ord('a')
            result += chr((ord(char) - offset + key) % 26 + offset)
        else:
            result += char
    return result

def xor(text, key):
    result = ""
    key_length = len(key)
    for i in range(len(text)):
        result += chr(ord(text[i]) ^ ord(key[i % key_length]))
    return result

plaintexts = ['MPRXRZKZVXAWWQGZ','YHWKTJPFLWJAAHHJ','LWIIUHYWQTURXSYU','QKVHKAALNCAYHUKZ','SPJOWKAWDCMWVDRQ','ENHIDMXJHTORAOYC','OLJQQJQAHKGVJCSD','TQEUNTRPNKPDUXUY','EXWPGETETKMAKBAC','CGKVGXRWUDFSNUBL','OAIWVAUJTYCBCDWO','NCTMFFZBGNAUXJYF','PCDUYALHPMVSVCOW','ZEZXUZXJTAHAKNUL','SOEKQSWRXZRVXQRM','DUQBHHUGGUOHAGQI']
ciphertexts = ['*1*! .,%(3 +>-;#','<\'%2"47;829/:<:9',')89<-68"%?&$?/#&','4*&?=-:1 ( -!!7#','618(/;:"0(4+=8**','"3:<49??4?,$:+#>','2+8.!40&4 :(#9)?','76="$$1+  -0<"\'"','"9%)113:& 4/,&!>',' &7#1(1"))=\'5! 7','2<9 ,-<?&4>.$8%,','1"(0609\'59 )?>#=','3">")--=""\'\'=9-$','= "!-.??&6;/,(\'7','60=2!%>-*5+(?-*4','!:+%06<<50,4:=+8']

mid = []
for i in range(len(plaintexts)):
    temp = []
    for j in range(26):
        temp.append(xor(rotate(plaintexts[i],j),ciphertexts[i]))
    mid.append(temp)

# print(mid)


for i in range(26):
    temp = mid[0][i]
    m = 0
    for j in range(len(plaintexts)):
        if temp == mid[j][i]:
            continue
        else:
            m=1
            break
    if m == 0:
        print(temp)