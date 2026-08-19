import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add success sound
content = re.sub(r"(alert\([\'\"\`](?:정답|성공|🎉|완벽)[^\'\"\`]*[\'\"\`]\);)", r'playSound("success"); \1', content)
# Add error sound
content = re.sub(r"(alert\([\'\"\`](?:오답|틀렸|비밀번호가 틀렸|오류)[^\'\"\`]*[\'\"\`]\);)", r'playSound("error"); \1', content)
# Add modal sound when removing hidden from a modal
content = re.sub(r"([a-zA-Z0-9_]+Modal\.classList\.remove\([\'\"\`]hidden[\'\"\`]\);)", r'\1 playSound("modal");', content)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)
