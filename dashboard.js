import { db, collection, doc, setDoc, getDoc, updateDoc, onSnapshot, getDocs, deleteDoc } from './firebase-config.js';

// 기본 활성 학급
let activeClass = '3-1';
const classInput = document.getElementById('class-input');
const currentTabTitle = document.getElementById('current-tab-title');

// 기본 6개 부서
const DEFAULT_DEPTS = [
    { id: 'dept-1', name: '디자인기획부' },
    { id: 'dept-2', name: '소재개발부' },
    { id: 'dept-3', name: '스타일링부' },
    { id: 'dept-4', name: '생산전략부' },
    { id: 'dept-5', name: '마케팅부' },
    { id: 'dept-6', name: '품질관리부' }
];

// 초기 학급 세팅 동기화
async function loadGlobalConfig() {
    const configSnap = await getDoc(doc(db, 'global', 'config'));
    if (configSnap.exists() && configSnap.data().currentActiveSession) {
        activeClass = configSnap.data().currentActiveSession;
    }
    classInput.value = activeClass;
    initDashboard();
}

document.getElementById('btn-set-class')?.addEventListener('click', async () => {
    const newClass = classInput.value.trim();
    if (newClass) {
        activeClass = newClass;
        try {
            await setDoc(doc(db, 'global', 'config'), { currentActiveSession: activeClass }, { merge: true });
            alert(`현재 모니터링 학급이 [${activeClass}]로 변경되었습니다.\n새로고침되는 학생 화면은 자동으로 이 반으로 접속됩니다.`);
            initDashboard();
        } catch(e) {
            console.error(e);
            alert("학급 설정 저장 실패");
        }
    }
});

// 메뉴 탭 전환
const tabs = document.querySelectorAll('.nav-item');
const panes = document.querySelectorAll('.tab-pane');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));
        
        tab.classList.add('active');
        const target = tab.getAttribute('data-tab');
        document.getElementById(`tab-${target}`).classList.add('active');
        currentTabTitle.textContent = tab.textContent.trim();
    });
});

// 게임 화면 복귀
document.getElementById('btn-exit')?.addEventListener('click', () => {
    window.close();
});

// ==========================================
// 파이어베이스 데이터 구독 및 렌더링
// ==========================================
let unsubscribes = [];

function initDashboard() {
    unsubscribes.forEach(unsub => unsub());
    unsubscribes = [];

    renderTeamTab();
    renderStatusTab();
    renderResultsTab();
    renderControlTab();
}

// 1. 조 편성 명단 관리 (팀 탭)
function renderTeamTab() {
    const container = document.getElementById('td-dept-list');
    container.innerHTML = '<p style="color: var(--text-muted); padding: 1rem;">현재 진행 중인 반의 부서 데이터를 불러오는 중입니다...</p>';
    
    const deptsRef = collection(db, `classes/${activeClass}/departments`);
    const unsub = onSnapshot(deptsRef, (snapshot) => {
        if (snapshot.empty) {
            container.innerHTML = '<p style="color: var(--text-muted); padding: 1rem;">현재 반에 생성된 부서가 없습니다. (학생이 메인 화면에서 부서를 선택하면 자동 생성됩니다)</p>';
            return;
        }

        container.innerHTML = '';
        snapshot.forEach(docSnap => {
            const deptId = docSnap.id;
            const deptData = docSnap.data();
            const deptName = deptData.name || deptId;
            
            const card = document.createElement('div');
            card.className = 'dept-card';
            card.innerHTML = `
                <h3>${deptName}</h3>
                <input type="text" placeholder="사원 학번/이름 (예: 30101 홍길동)" class="member-input" data-dept="${deptId}" data-role="사원">
                <input type="text" placeholder="대리 학번/이름" class="member-input" data-dept="${deptId}" data-role="대리">
                <input type="text" placeholder="과장 학번/이름" class="member-input" data-dept="${deptId}" data-role="과장">
                <input type="text" placeholder="차장 학번/이름" class="member-input" data-dept="${deptId}" data-role="차장">
                <input type="text" placeholder="부장 학번/이름" class="member-input" data-dept="${deptId}" data-role="부장">
            `;
            container.appendChild(card);
            
            // 기존 학생 매핑 데이터 불러오기
            const rolesRef = collection(db, `classes/${activeClass}/departments/${deptId}/roles`);
            getDocs(rolesRef).then(rolesSnap => {
                rolesSnap.forEach(roleDoc => {
                    const rData = roleDoc.data();
                    if (rData.studentName) {
                        const input = card.querySelector(`input[data-role="${roleDoc.id}"]`);
                        if (input) input.value = rData.studentName;
                    }
                });
            });
        });
    });
    unsubscribes.push(unsub);
}

// 명단 자동 저장 이벤트 (이벤트 위임)
document.getElementById('td-dept-list').addEventListener('change', async (e) => {
    if (e.target.classList.contains('member-input')) {
        const deptId = e.target.getAttribute('data-dept');
        const role = e.target.getAttribute('data-role');
        const val = e.target.value.trim();
        
        try {
            const roleRef = doc(db, `classes/${activeClass}/departments/${deptId}/roles`, role);
            await setDoc(roleRef, { studentName: val }, { merge: true });
            
            // 시각적 피드백
            e.target.style.borderColor = 'var(--success)';
            e.target.style.boxShadow = '0 0 5px var(--success)';
            setTimeout(() => {
                e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                e.target.style.boxShadow = 'none';
            }, 1000);
        } catch (error) {
            console.error(error);
            alert("저장 실패");
        }
    }
});

// 기본 6개 부서 생성 버튼
document.getElementById('btn-init-depts')?.addEventListener('click', async () => {
    try {
        const promises = DEFAULT_DEPTS.map(dept => 
            setDoc(doc(db, `classes/${activeClass}/departments`, dept.name), {
                name: dept.name,
                currentStage: 1,
                createdAt: Date.now()
            }, { merge: true })
        );
        await Promise.all(promises);
        alert('기본 6개 부서가 생성되었습니다.');
    } catch (e) {
        console.error(e);
        alert('부서 생성 실패');
    }
});

// 새 부서 추가 버튼
document.getElementById('btn-add-team')?.addEventListener('click', async () => {
    const deptName = prompt('새로운 부서 이름을 입력하세요:');
    if (!deptName || !deptName.trim()) return;
    
    try {
        await setDoc(doc(db, `classes/${activeClass}/departments`, deptName.trim()), {
            name: deptName.trim(),
            currentStage: 1,
            createdAt: Date.now()
        }, { merge: true });
    } catch (e) {
        console.error(e);
        alert('부서 추가 실패');
    }
});

// 학생 명단 파싱 및 Pill 생성
document.getElementById('btn-parse-roster')?.addEventListener('click', () => {
    const text = document.getElementById('roster-input').value;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const container = document.getElementById('roster-pills');
    container.innerHTML = '';
    
    if(lines.length === 0) {
        container.innerHTML = '<span style="color:#aaa;">입력된 명단이 없습니다.</span>';
        return;
    }
    
    lines.forEach(line => {
        const pill = document.createElement('div');
        pill.className = 'roster-pill';
        pill.textContent = line;
        pill.draggable = true;
        pill.style.cssText = 'background: var(--accent-gold); color: black; padding: 0.4rem 0.8rem; border-radius: 20px; font-weight: bold; cursor: grab; user-select: none; font-size: 0.9rem; transition: transform 0.1s;';
        
        pill.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', line);
            pill.style.opacity = '0.5';
            window.draggedStudent = line;
        });
        pill.addEventListener('dragend', () => {
            pill.style.opacity = '1';
            window.draggedStudent = null;
        });
        
        // 클릭 투 인풋 선택
        pill.addEventListener('click', () => {
            document.querySelectorAll('.roster-pill').forEach(p => p.style.boxShadow = 'none');
            pill.style.boxShadow = '0 0 0 3px white';
            window.selectedStudentPill = line;
        });
        
        container.appendChild(pill);
    });
});

// td-dept-list 드래그 앤 드롭 및 클릭 투 인풋 지원
const deptListContainer = document.getElementById('td-dept-list');
deptListContainer.addEventListener('dragover', (e) => {
    if (e.target.classList.contains('member-input')) {
        e.preventDefault();
        e.target.style.borderColor = 'var(--accent-gold)';
    }
});
deptListContainer.addEventListener('dragleave', (e) => {
    if (e.target.classList.contains('member-input')) {
        e.target.style.borderColor = 'rgba(255,255,255,0.1)';
    }
});
deptListContainer.addEventListener('drop', (e) => {
    if (e.target.classList.contains('member-input')) {
        e.preventDefault();
        e.target.style.borderColor = 'rgba(255,255,255,0.1)';
        const data = e.dataTransfer.getData('text/plain');
        if (data) {
            e.target.value = data;
            e.target.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
});
deptListContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('member-input') && window.selectedStudentPill) {
        e.target.value = window.selectedStudentPill;
        e.target.dispatchEvent(new Event('change', { bubbles: true }));
    }
});

// 2. 실시간 현황판 (상태 탭)
function renderStatusTab() {
    const container = document.getElementById('td-progress-board');
    container.innerHTML = '<p>실시간 데이터를 불러오는 중...</p>';
    
    const deptsRef = collection(db, `classes/${activeClass}/departments`);
    const unsub = onSnapshot(deptsRef, (snapshot) => {
        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = '<p>현재 진행 중인 부서 데이터가 없습니다.</p>';
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'grid-layout';

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const card = document.createElement('div');
            card.className = 'dept-card';
            card.innerHTML = `
                <h3>${docSnap.id}</h3>
                <p style="font-size: 2rem; color: var(--accent-gold); font-weight: 900; margin-top: 1rem;">
                    Stage ${data.currentStage || 1}
                </p>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.5rem;">마지막 업데이트: 방금 전</p>
            `;
            grid.appendChild(card);
        });

        container.appendChild(grid);
        updateForcePassSelect(snapshot);
    });
    unsubscribes.push(unsub);
}

function updateForcePassSelect(snapshot) {
    const select = document.getElementById('force-pass-select');
    if (!select) return;
    select.innerHTML = '<option value="">부서 선택...</option>';
    snapshot.forEach(docSnap => {
        const opt = document.createElement('option');
        opt.value = docSnap.id;
        opt.textContent = `${docSnap.id} (Stage ${docSnap.data().currentStage || 1})`;
        select.appendChild(opt);
    });
}

// 3. 학생 결과물 확인
function renderResultsTab() {
    const container = document.getElementById('td-results-gallery');
    container.innerHTML = '<p style="color: var(--text-muted); padding: 1rem;">결과물 데이터를 불러오는 중입니다...</p>';
    
    const deptsRef = collection(db, `classes/${activeClass}/departments`);
    
    // 이 탭은 onSnapshot 대신 버튼 누르거나 탭 전환 시 새로고침하는 것이 효율적입니다.
    // 하지만 onSnapshot으로 실시간 연동해두면 더 좋습니다.
    const unsub = onSnapshot(deptsRef, async (snapshot) => {
        if (snapshot.empty) {
            container.innerHTML = '<p style="color: var(--text-muted); padding: 1rem;">현재 반에 데이터가 없습니다.</p>';
            return;
        }

        container.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'grid-layout';

        for (const docSnap of snapshot.docs) {
            const deptId = docSnap.id;
            const rolesRef = collection(db, `classes/${activeClass}/departments/${deptId}/roles`);
            const rolesSnap = await getDocs(rolesRef);
            
            rolesSnap.forEach(roleDoc => {
                const roleId = roleDoc.id;
                const data = roleDoc.data();
                
                if (data.personalDesign && data.personalDesign.designImage) {
                    const studentName = data.studentName ? data.studentName : '이름 미상';
                    const card = document.createElement('div');
                    card.className = 'dept-card';
                    card.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <h3 style="margin: 0; color: var(--accent-gold); font-size: 1.1rem;">${deptId} - ${roleId}</h3>
                            <span style="font-size: 0.8rem; background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 10px;">${studentName}</span>
                        </div>
                        <img src="${data.personalDesign.designImage}" style="width: 100%; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); margin-bottom: 1rem;">
                        <div style="font-size: 0.85rem; color: #ddd; line-height: 1.4;">
                            <p><strong style="color:var(--accent-blue)">TPO:</strong> ${data.personalDesign.tpo || '-'}</p>
                            <p><strong style="color:var(--success)">5R:</strong> ${data.personalDesign.r5 || '-'}</p>
                        </div>
                        <button onclick="downloadImage('${data.personalDesign.designImage}', '${deptId}_${roleId}_${studentName}.png')" style="width:100%; padding: 0.5rem; margin-top: 1rem; border-radius: 8px; border: none; background: var(--accent-gold); color: black; font-weight: bold; cursor: pointer;">이미지 다운로드</button>
                    `;
                    grid.appendChild(card);
                }
            });
        }
        
        if (grid.children.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); padding: 1rem;">아직 제출된 결과물이 없습니다.</p>';
        } else {
            container.appendChild(grid);
        }
    });
    unsubscribes.push(unsub);
}

// 글로벌 공간에 다운로드 함수 노출
window.downloadImage = function(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

// 4. 강력 제어 탭
function renderControlTab() {
    // 이벤트 리스너가 중복 등록되지 않도록 기존 리스너 제거 방식 대신 onclick 사용 (안전)
    const btnForcePass = document.getElementById('btn-force-pass');
    if(btnForcePass) btnForcePass.onclick = async () => {
        const select = document.getElementById('force-pass-select');
        const deptId = select.value;
        if (!deptId) return alert('부서를 선택하세요.');
        
        try {
            const ref = doc(db, `classes/${activeClass}/departments`, deptId);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                const stage = snap.data().currentStage || 1;
                await updateDoc(ref, { currentStage: stage + 1 });
                alert(`${deptId} 부서를 강제로 Stage ${stage + 1}로 넘겼습니다.`);
            }
        } catch(e) {
            console.error(e);
            alert("오류 발생");
        }
    };

    const btnSendNotice = document.getElementById('btn-send-notice');
    if(btnSendNotice) btnSendNotice.onclick = async () => {
        const msg = document.getElementById('notice-input').value.trim();
        if (!msg) return;
        
        try {
            const ref = doc(db, `classes/${activeClass}/global`, 'notice');
            await setDoc(ref, { message: msg, timestamp: Date.now() });
            alert('공지가 전송되었습니다.');
            document.getElementById('notice-input').value = '';
        } catch(e) {
            console.error(e);
            alert("전송 실패");
        }
    };
    
    const btnToggleFreeze = document.getElementById('btn-toggle-freeze');
    let isFrozen = false;
    if(btnToggleFreeze) btnToggleFreeze.onclick = async () => {
        isFrozen = !isFrozen;
        try {
            const ref = doc(db, `classes/${activeClass}/global`, 'state');
            await setDoc(ref, { freeze: isFrozen }, { merge: true });
            btnToggleFreeze.textContent = isFrozen ? '얼음 해제' : '얼음 활성화';
            btnToggleFreeze.className = isFrozen ? 'btn-success' : 'btn-danger';
        } catch(e) {
            console.error(e);
        }
    };
    
    const btnResetClass = document.getElementById('btn-reset-class');
    if(btnResetClass) btnResetClass.onclick = async () => {
        if(confirm(`정말 [${activeClass}] 반의 모든 데이터를 삭제하시겠습니까? 복구할 수 없습니다!`)) {
            try {
                // 부서 목록 가져오기
                const deptsRef = collection(db, `classes/${activeClass}/departments`);
                const snap = await getDocs(deptsRef);
                
                // 순회하며 삭제
                snap.forEach(async (docSnap) => {
                    await deleteDoc(doc(db, `classes/${activeClass}/departments`, docSnap.id));
                });
                
                alert(`[${activeClass}] 반 초기화가 완료되었습니다.`);
            } catch(e) {
                console.error(e);
                alert("초기화 실패");
            }
        }
    };
}

// 최초 실행
loadGlobalConfig();
