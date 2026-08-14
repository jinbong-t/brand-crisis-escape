$content = Get-Content "app.js" -Raw -Encoding UTF8
$content = $content -replace '(?s)onSnapshot\(doc\(db,\s*''departments'',\s*currentDeptId\),\s*\(docSnap\)\s*=>\s*\{\s*const\s+d\s*=\s*docSnap\.data\(\);\s*if\s*\(d\s*&&\s*d\.showStage1Reasoning\)\s*\{\s*showReasoningModal\(PUZZLE_DATA\.stage1,\s*2\);\s*\}\s*\}\);', ''
$content = $content -replace '(?s)onSnapshot\(doc\(db,\s*''departments'',\s*currentDeptId\),\s*\(docSnap\)\s*=>\s*\{\s*const\s+d\s*=\s*docSnap\.data\(\);\s*if\s*\(d\s*&&\s*d\.showStage3Reasoning\)\s*\{\s*showReasoningModal\(PUZZLE_DATA\.stage3,\s*4\);\s*\}\s*\}\);', ''
$content = $content.Replace("                    } else if (stage === 1) {
                        const s2 = document.getElementById('screen-2');
                        if (s2) {
                            s2.classList.remove('hidden');
                            startScreen2();
                        }
                    }", "                    } else if (stage === 1) {
                        const s2 = document.getElementById('screen-2');
                        if (s2) {
                            s2.classList.remove('hidden');
                            startScreen2();
                            if (d && d.showStage1Reasoning) {
                                showReasoningModal(PUZZLE_DATA.stage1, 2);
                            }
                        }
                    }")
$content = $content.Replace("                    } else if (stage === 3) {
                        const s4 = document.getElementById('screen-4');
                        if (s4) {
                            s4.classList.remove('hidden');
                            startScreen4();
                        }
                    }", "                    } else if (stage === 3) {
                        const s4 = document.getElementById('screen-4');
                        if (s4) {
                            s4.classList.remove('hidden');
                            startScreen4();
                            if (d && d.showStage3Reasoning) {
                                showReasoningModal(PUZZLE_DATA.stage3, 4);
                            }
                        }
                    }")
Set-Content "app.js" $content -Encoding UTF8
