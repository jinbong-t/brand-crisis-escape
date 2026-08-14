
$bytes = [System.IO.File]::ReadAllBytes("app.js")
$pos = 0
while($pos -lt ($bytes.Length - 2) -and $bytes[$pos] -eq 0xEF -and $bytes[$pos+1] -eq 0xBB -and $bytes[$pos+2] -eq 0xBF) { $pos += 3 }
$content = [System.Text.Encoding]::UTF8.GetString($bytes[$pos..($bytes.Length-1)])

$lines = $content -split "`n"

# startScreen2 ?⑥ 援泥?(?쇱?697~897, 0-indexed: 696~896)
$newFunc = @'
// ==========================================
// Screen 2: 1?④? (???몄??? 濡吏
// ==========================================
function startScreen2(deptData) {
    mainHeader.classList.remove('hidden');
    currentTeamDisplay.textContent = `${currentDeptName} - ${currentRole}`;
    
    document.getElementById('display-current-role').textContent = currentRole;
    
    // 1?④? ?ㅽ由?紐⑤???곌린
    document.getElementById('stage1-story-modal').classList.remove('hidden');
    
    document.getElementById('btn-start-stage1-missions').onclick = () => {
        document.getElementById('stage1-story-modal').classList.add('hidden');
    };
    
    // 誘몄 1-1 (紐쏀二? ?ㅼ
    const montageData = PUZZLE_DATA.stage1.montage[currentRole];
    document.getElementById('montage-clue-text').innerHTML = montageData.text;
    
    const optionsContainer = document.getElementById('montage-options');
    optionsContainer.innerHTML = '';
    montageData.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'btn-secondary';
        btn.textContent = opt;
        btn.addEventListener('click', () => {
            optionsContainer.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            
            if (btn.textContent === montageData.answer) {
                alert('??듭??? ?ㅼ 誘몄???대몄듬??);
                optionsContainer.querySelectorAll('button').forEach(b => b.disabled = true);
                const m2 = document.getElementById('mission-1-2');
                if (m2) {
                    m2.classList.remove('hidden');
                    m2.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            } else {
                alert('??몄듬?? ?⑥瑜??ㅼ ??명대낫?몄.');
                btn.classList.remove('selected');
            }
        });
        optionsContainer.appendChild(btn);
    });

    // 誘몄 1-2 (???援吏?? ?ㅼ
    const fabricData = PUZZLE_DATA.stage1.fabricStandards[currentRole];
    document.getElementById('fabric-clue-title').textContent = fabricData.title;
    document.getElementById('fabric-clue-text').textContent = fabricData.text;
    
    const btnSubmitM2 = document.getElementById('btn-submit-mission-1-2');
    if (btnSubmitM2) {
        btnSubmitM2.textContent = currentRole === '遺?? ? '理醫 ?뱀명湲? : '遺?λ猿 寃곗??щ━湲?;
    }
    
    document.querySelectorAll('.fabric-btn').forEach(btn => {
        btn.onclick = () => btn.classList.toggle('selected');
    });

    document.getElementById('btn-submit-mission-1-2').onclick = async () => {
        const selectedButtons = Array.from(document.querySelectorAll('.fabric-btn.selected'));
        if (selectedButtons.length === 0) {
            alert('??⑥ ?? ?댁 ???댁＜?몄.');
            return;
        }
        
        const selectedValues = selectedButtons.map(btn => btn.getAttribute('data-val')).sort();
        let isCorrect = false;
        if (Array.isArray(fabricData.answer)) {
            const answerValues = [...fabricData.answer].sort();
            isCorrect = JSON.stringify(selectedValues) === JSON.stringify(answerValues);
        } else {
            isCorrect = selectedValues.length === 1 && selectedValues[0] === fabricData.answer;
        }
        
        if (isCorrect) {
            document.getElementById('btn-submit-mission-1-2').disabled = true;
            document.querySelectorAll('.fabric-btn').forEach(b => b.disabled = true);
            
            if (currentRole === '遺??) {
                document.getElementById('btn-submit-mission-1-2').textContent = '理醫 ????猷 ?';
                document.getElementById('manager-submit-panel').classList.remove('hidden');
                document.getElementById('manager-submit-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                document.getElementById('btn-submit-mission-1-2').textContent = '?⑥ ????猷 ?';
                
                try {
                    const roleRef = doc(db, `departments/${currentDeptId}/roles`, currentRole);
                    await setDoc(roleRef, { stage1Confirmed: true, selectedFabrics: selectedValues }, { merge: true });
                } catch(e) {
                    console.error('????ㅻ?:', e);
                }
                
                const waitingEl = document.getElementById('mission-complete-waiting');
                if (waitingEl) {
                    waitingEl.classList.remove('hidden');
                    waitingEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                
                alert('誘몄 ?猷! 遺?λ? ? ?濡 寃곌낵瑜?湲곕ㅻ━?몄.');
            }
        } else {
            alert('??몄듬?? 媛 遺遺? 議곌굔? ?ㅼ ?踰 瑗쇨세? ??명?몄');
        }
    };

    if (currentRole === '遺??) {
        document.getElementById('manager-montage-panel').classList.remove('hidden');
        document.getElementById('manager-submit-panel').classList.add('hidden');
        
        onSnapshot(collection(db, `departments/${currentDeptId}/roles`), (snapshot) => {
            const requiredRoles = ['?명?, '?ъ', '李⑥?];
            
            requiredRoles.forEach(role => {
                const statusEl = document.getElementById(`status-${role}`);
                if (!statusEl) return;
                
                const roleDoc = snapshot.docs.find(d => d.id === role);
                const isConfirmed = roleDoc && roleDoc.data().stage1Confirmed;
                
                if (isConfirmed) {
                    statusEl.classList.add('done');
                    statusEl.querySelector('.status-icon').textContent = '?';
                    statusEl.style.background = 'rgba(0,100,0,0.5)';
                } else {
                    statusEl.classList.remove('done');
                    statusEl.querySelector('.status-icon').textContent = '?';
                    statusEl.style.background = 'rgba(0,0,0,0.5)';
                }
            });
            
            document.getElementById('btn-submit-stage1').disabled = false;
        });
        
        const btnSubmitStage1 = document.getElementById('btn-submit-stage1');
        btnSubmitStage1.onclick = async () => {
            const finalAnswer1 = document.getElementById('manager-final-answer-1').value;
            const finalAnswer2 = document.getElementById('manager-final-answer-2').value;
            const errorMsg = document.getElementById('manager-error-msg');
            
            if (!finalAnswer1 || !finalAnswer2) {
                alert('誘몄 1(紐쏀二?怨?誘몄 2(移?寃???? ??듭 紐⑤ ???댁＜?몄.');
                return;
            }
            
            if (finalAnswer1 === 'B' && finalAnswer2 === 'H') {
                errorMsg.classList.add('hidden');
                btnSubmitStage1.disabled = true;
                btnSubmitStage1.textContent = '? ???????猷!';
                
                const directionPanel = document.getElementById('direction-choice-panel');
                if (directionPanel) {
                    directionPanel.classList.remove('hidden');
                    directionPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            } else {
                errorMsg.classList.remove('hidden');
                errorMsg.textContent = '?ㅻ듭??? ???ㅼ?紐⑥???⑥(援吏??瑜??ㅼ 遺??대낫?몄.';
            }
        };
        
        const btnProfit = document.getElementById('btn-direction-profit');
        const btnEco = document.getElementById('btn-direction-eco');
        
        const goToStage2 = async (direction) => {
            if (btnProfit) btnProfit.disabled = true;
            if (btnEco) btnEco.disabled = true;
            
            try {
                await setDoc(doc(db, 'departments', currentDeptId), {
                    currentStage: 2,
                    stage1Direction: direction,
                    showStage1Reasoning: false
                }, { merge: true });
            } catch(e) {
                console.error('2?④? 吏? ?ㅻ?:', e);
                alert('?踰 ?ㅻ?媛 諛???듬?? ?ㅼ ???댁＜?몄.');
                if (btnProfit) btnProfit.disabled = false;
                if (btnEco) btnEco.disabled = false;
            }
        };
        
        if (btnProfit) {
            btnProfit.onclick = () => {
                if (confirm('???????以?ъ쇰? 2?④?瑜?吏???寃?듬源? (?? ? 紐⑤ ????2?④?濡 ?대?⑸??')) {
                    goToStage2('profit');
                }
            };
        }
        if (btnEco) {
            btnEco.onclick = () => {
                if (confirm('?寃?吏?媛?ν ??? 諛⑺μ쇰? 2?④?瑜?吏???寃?듬源? (?? ? 紐⑤ ????2?④?濡 ?대?⑸??')) {
                    goToStage2('eco');
                }
            };
        }
        
    } else {
        document.getElementById('manager-montage-panel').classList.add('hidden');
        document.getElementById('manager-submit-panel').classList.add('hidden');
    }
}
'@

# 0-indexed: 696~896
$before = $lines[0..695]
$after = $lines[897..($lines.Length-1)]

$newContent = ($before -join "`n") + "`n" + $newFunc + "`n" + ($after -join "`n")

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText("app.js", $newContent, $utf8NoBom)
Write-Output "????猷! ?ш린: $((Get-Item 'app.js').Length) bytes"

# 寃利
$check = [System.IO.File]::ReadAllText("app.js", [System.Text.Encoding]::UTF8)
$hasFunc = $check.Contains("goToStage2")
$hasDirectionPanel = $check.Contains("direction-choice-panel")
Write-Output "goToStage2 ?⑥ ?ы? $hasFunc"
Write-Output "direction-choice-panel 李몄“: $hasDirectionPanel"
