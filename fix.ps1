$c = Get-Content app.js -Raw
$pattern = '(?s)  // --- Stage 6, 7 영역 이벤트 리스너 ---\r?\n  const btnSubmitPersonal = document\.getElementById\(''btn-submit-personal-design''\);\r?\n  if \(btnSubmitPersonal\) \{\r?\n      btnSubmitPersonal\.onclick = \(\) => \{.*?      \};\r?\n  \}'
$replacement = '  // --- Stage 6, 7 영역 이벤트 리스너 ---'
$c = $c -replace $pattern, $replacement
Set-Content app.js -Value $c -NoNewline
