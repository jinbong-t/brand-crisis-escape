import codecs

with codecs.open('app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'const roles =' in line:
        if i < 500:
            lines[i] = "        const roles = ['인턴', '사원', '차장', '부장'];\n"
        else:
            lines[i] = "            const roles = ['인턴', '사원', '차장'];\n"

with codecs.open('app.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Python fix applied!")
