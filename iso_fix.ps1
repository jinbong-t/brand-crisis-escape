$enc = [System.Text.Encoding]::GetEncoding("iso-8859-1")
$text = [System.IO.File]::ReadAllText("app.js", $enc)

# Replace the broken roles array lines using Regex
# We match "const roles = [" up to "];" or the end of line
# (?m) enables multiline so ^ matches start of line
$text = [regex]::Replace($text, '(?m)^\s*const roles = \[.*?(?:\];|\r?)$', "        const roles = ['인턴', '사원', '차장', '부장'];")

# We also saw "const requiredRoles =" at line 805
$text = [regex]::Replace($text, '(?m)^\s*const requiredRoles = \[.*?(?:\];|\r?)$', "            const requiredRoles = ['인턴', '사원', '차장'];")

# Write it back using the same encoding
[System.IO.File]::WriteAllText("app.js", $text, $enc)
Write-Output "ISO-8859-1 fix applied!"
