const fs = require('fs');

let content = fs.readFileSync('app.js', 'utf8');

// Add success sound
content = content.replace(/(alert\(['"`](?:정답|성공|🎉|완벽)[^'"`]*['"`]\);)/g, 'playSound("success"); $1');
// Add error sound
content = content.replace(/(alert\(['"`](?:오답|틀렸|비밀번호가 틀렸|오류)[^'"`]*['"`]\);)/g, 'playSound("error"); $1');
// Add modal sound when removing hidden from a modal
content = content.replace(/([a-zA-Z0-9_]+Modal\.classList\.remove\(['"`]hidden['"`]\);)/g, '$1 playSound("modal");');

fs.writeFileSync('app.js', content, 'utf8');
