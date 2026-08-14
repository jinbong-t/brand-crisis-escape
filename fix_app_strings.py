import sys
import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    (r""id:\s*'dept-1',\s*name:\s*'[^\']+ '?"", ""id: 'dept-1', name: '디자인기획부'""),
    (r""id:\s*'dept-2',\s*name:\s*'[^\']+ '?"", ""id: 'dept-2', name: '소재개발부'""),
    (r""id:\s*'dept-3',\s*name:\s*'[^\']+ '?"", ""id: 'dept-3', name: '스타일링부'""),
    (r""id:\s*'dept-4',\s*name:\s*'[^\']+ '?"", ""id: 'dept-4', name: '생산전략부'""),
    (r""id:\s*'dept-5',\s*name:\s*'[^\']+ '?"", ""id: 'dept-5', name: '마케팅부'""),
    (r""id:\s*'dept-6',\s*name:\s*'[^\']+ '?"", ""id: 'dept-6', name: '품질관리부'""),
    
    (r""const\s*roles\s*=\s*\[.*\];"", ""const roles = ['인턴', '사원', '차장', '부장'];""),
]

for pat, repl in replacements:
    content = re.sub(pat, repl, content, count=1)

# fix the switch statement
# we can just find 'function getRoleDesc(role) {'
# and replace the whole function

# replace some garbled alerts

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')