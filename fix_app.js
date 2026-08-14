const fs = require('fs');
let content = fs.readFileSync('app.js', 'utf-8');

// 1. initApp
content = content.replace('startScreen2();', 'startScreen2(d);');
content = content.replace('startScreen4();', 'startScreen4(d);');

// 2. startScreen2
content = content.replace('function startScreen2() {', 'function startScreen2(deptData) {');
content = content.replace('document.getElementById(\'stage1-story-modal\').classList.remove(\'hidden\');', if (!(deptData && deptData.showStage1Reasoning)) {
        document.getElementById('stage1-story-modal').classList.remove('hidden');
    });

// 3. startScreen4
content = content.replace('function startScreen4() {', 'function startScreen4(deptData) {');
content = content.replace('document.getElementById(\'stage3-story-modal\').classList.remove(\'hidden\');', if (!(deptData && deptData.showStage3Reasoning)) {
        document.getElementById('stage3-story-modal').classList.remove('hidden');
    });

// 4. btnSubmitStage1
const stage1_old =                 try {
                    await updateDoc(doc(db, 'departments', currentDeptId), {
                        showStage1Reasoning: true
                    });
                    alert('?? 모든 팀원의 의견을 종합하여 진짜 도안과 원단을 찾았습니다!\\n\\n이제 팝업되는 \\'실천적 추론\\' 문제를 부서원들과 토론하여 해결하세요!');
                    showReasoningModal(PUZZLE_DATA.stage1, 2);
                } catch(e) {
                    console.error(e);
                };

const stage1_new =                 alert('?? 모든 팀원의 의견을 종합하여 진짜 도안과 원단을 찾았습니다!\\n\\n이제 팝업되는 \\'실천적 추론\\' 문제를 부서원들과 토론하여 해결하세요!');
                showReasoningModal(PUZZLE_DATA.stage1, 2);
                updateDoc(doc(db, 'departments', currentDeptId), {
                    showStage1Reasoning: true
                }).catch(e => console.error(e));;
content = content.replace(stage1_old, stage1_new);

// 5. btnSubmitStage3
const stage3_old =                 try {
                    await updateDoc(doc(db, 'departments', currentDeptId), {
                        showStage3Reasoning: true
                    });
                    showReasoningModal(PUZZLE_DATA.stage3, 4);
                } catch(e) {
                    console.error(e);
                };
const stage3_new =                 showReasoningModal(PUZZLE_DATA.stage3, 4);
                updateDoc(doc(db, 'departments', currentDeptId), {
                    showStage3Reasoning: true
                }).catch(e => console.error(e));;
content = content.replace(stage3_old, stage3_new);

fs.writeFileSync('app.js', content, 'utf-8');
