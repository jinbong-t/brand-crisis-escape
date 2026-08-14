$bytes = [System.IO.File]::ReadAllBytes("app.js")
$text = [System.Text.Encoding]::UTF8.GetString($bytes)
$lines = $text.Split("`n")

for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i].Contains([char]0xFFFD)) {
        Write-Output "Line $($i+1): $($lines[$i])"
    }
}
