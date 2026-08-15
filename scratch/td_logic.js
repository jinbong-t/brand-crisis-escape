// --- 교사 대시보드 (Teacher Dashboard) 로직 ---
window.initTeacherDashboard = function() {
    console.log('Teacher Dashboard Initialized');
    const tdScreen = document.getElementById('screen-teacher-dashboard');
    if(!tdScreen) return;
    
    // UI Elements
    const inputActiveClass = document.getElementById('td-active-class-input');
    const btnSetClass = document.getElementById('btn-td-set-class');
    const btnExit = document.getElementById('btn-td-exit');
    const tabs = document.querySelectorAll('.td-menu-item');
    const tabContents = document.querySelectorAll('.td-tab-content');
    
    // 탭 전환 로직
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => {
                t.classList.remove('active');
                t.style.borderLeft = '3px solid transparent';
                t.style.background = 'transparent';
            });
            tab.classList.add('active');
            tab.style.borderLeft = '3px solid var(--accent-gold)';
            tab.style.background = 'rgba(255,215,0,0.1)';
            
            const targetId = tab.getAttribute('data-tab');
            tabContents.forEach(content => {
                content.classList.add('hidden');
                if(content.id === targetId) content.classList.remove('hidden');
            });
            
            // 탭별 새로고침
            if(targetId === 'tab-roster') renderTdRoster();
            if(targetId === 'tab-progress') loadProgressData();
            if(targetId === 'tab-results') loadResultsData();
        });
    });

    // 반 설정
    inputActiveClass.value = activeClass;
    btnSetClass.addEventListener('click', async () => {
        const val = inputActiveClass.value.trim();
        if(val) {
            try {
                await setDoc(doc(db, "admin", "config"), { activeClass: val }, { merge: true });
                activeClass = val;
                alert(`활성 학급이 [${val}]로 설정되었습니다.`);
                renderTdRoster();
            } catch(e) { console.error(e); alert('학급 설정 실패'); }
        }
    });

    // 나가기
    btnExit.addEventListener('click', () => {
        tdScreen.classList.add('hidden');
        document.getElementById('screen-splash').classList.remove('hidden');
    });

    // 1. 조 편성 및 명단 관리
    function renderTdRoster() {
        const container = document.getElementById('td-roster-container');
        if(!container) return;
        const depts = getDepartments();
        container.innerHTML = '';
        
        depts.forEach(dept => {
            const card = document.createElement('div');
            card.style.background = 'rgba(255,255,255,0.05)';
            card.style.padding = '15px';
            card.style.borderRadius = '8px';
            card.style.border = '1px solid #444';
            
            let html = `<h4 style="color: var(--accent-gold); margin-bottom: 10px;">${dept.name}</h4>`;
            const roles = ['인턴', '사원', '차장', '부장'];
            roles.forEach(role => {
                // 저장된 명단 불러오기 로직 필요 시 localStorage 혹은 Firebase 연동 가능
                // 현재는 로컬 스토리지에 임시 매핑 정보를 저장
                const key = `roster_${activeClass}_${dept.id}_${role}`;
                const savedName = localStorage.getItem(key) || '';
                
                html += `<div style="display: flex; gap: 10px; margin-bottom: 5px; align-items: center;">
                    <label style="width: 40px; color: #ccc; font-size: 0.9rem;">${role}</label>
                    <input type="text" class="td-roster-input" data-key="${key}" value="${savedName}" placeholder="학번 이름 (예: 30101 홍길동)" style="flex: 1; padding: 5px; background: #222; border: 1px solid #555; color: white; border-radius: 4px;">
                </div>`;
            });
            html += `<button class="btn-primary btn-save-roster" style="width: 100%; margin-top: 10px; font-size: 0.9rem; padding: 5px;">명단 저장</button>`;
            card.innerHTML = html;
            container.appendChild(card);
        });
        
        document.querySelectorAll('.btn-save-roster').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('div');
                const inputs = card.querySelectorAll('.td-roster-input');
                inputs.forEach(input => {
                    localStorage.setItem(input.getAttribute('data-key'), input.value);
                });
                alert('명단이 임시 저장되었습니다.');
            });
        });
    }

    // 2. 실시간 진행 현황판
    async function loadProgressData() {
        const tbody = document.getElementById('td-progress-tbody');
        if(!tbody) return;
        tbody.innerHTML = '<tr><td colspan="8">데이터 로딩 중...</td></tr>';
        
        try {
            const depts = getDepartments();
            let html = '';
            for(const dept of depts) {
                // 부서 진행 단계
                const deptSnap = await getDoc(getDeptDocRef(dept.id));
                const stage = deptSnap.exists() ? (deptSnap.data().currentStage || 0) : 0;
                
                const roles = ['인턴', '사원', '차장', '부장'];
                let isFirstRow = true;
                for(const role of roles) {
                    const roleSnap = await getDoc(getRoleDocRef(dept.id, role));
                    const rd = roleSnap.exists() ? roleSnap.data() : {};
                    const rosterName = localStorage.getItem(`roster_${activeClass}_${dept.id}_${role}`) || '미입력';
                    
                    const q1 = rd.q1 ? '✅' : '❌';
                    const q2 = rd.q2 ? '✅' : '❌';
                    const q3 = rd.q3 ? '✅' : '❌';
                    const pR5 = rd.personalMission ? '✅' : '❌';
                    const refl = rd.reflection ? '✅' : '❌';
                    
                    html += `<tr style="border-bottom: 1px solid #333;">
                        ${isFirstRow ? `<td rowspan="4" style="color: var(--accent-gold); border-right: 1px solid #333; font-weight: bold;">${dept.name}</td>` : ''}
                        <td style="padding: 10px; color: #ccc;">${role} (${rosterName})</td>
                        <td style="padding: 10px;">${stage}단계</td>
                        <td style="padding: 10px;">${q1}</td>
                        <td style="padding: 10px;">${q2}</td>
                        <td style="padding: 10px;">${q3}</td>
                        <td style="padding: 10px;">${pR5}</td>
                        <td style="padding: 10px;">${refl}</td>
                    </tr>`;
                    isFirstRow = false;
                }
            }
            tbody.innerHTML = html;
        } catch(e) {
            console.error(e);
            tbody.innerHTML = '<tr><td colspan="8" style="color: red;">데이터 불러오기 실패</td></tr>';
        }
    }
    document.getElementById('btn-td-refresh-progress')?.addEventListener('click', loadProgressData);

    // 3. 학생 결과물 확인 (캡처)
    async function loadResultsData() {
        const container = document.getElementById('td-results-container');
        if(!container) return;
        container.innerHTML = '데이터 로딩 중...';
        
        try {
            const depts = getDepartments();
            let html = '';
            for(const dept of depts) {
                const roles = ['인턴', '사원', '차장', '부장'];
                for(const role of roles) {
                    const roleSnap = await getDoc(getRoleDocRef(dept.id, role));
                    if(!roleSnap.exists()) continue;
                    const rd = roleSnap.data();
                    const rosterName = localStorage.getItem(`roster_${activeClass}_${dept.id}_${role}`) || `${dept.name}_${role}`;
                    
                    if(rd.personalMission && rd.personalMission.image) {
                        html += `
                        <div class="result-card" style="background: white; color: black; padding: 15px; border-radius: 8px;">
                            <h4 style="margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">${rosterName}</h4>
                            <img src="${rd.personalMission.image}" style="width: 100%; max-height: 300px; object-fit: contain; background: #eee; border-radius: 4px; margin-bottom: 10px;">
                            <p style="font-size: 0.9rem; font-weight: bold; color: #1e88e5;">[선택 요소]: ${rd.personalMission.r5}</p>
                            <p style="font-size: 0.8rem; color: #555; height: 60px; overflow-y: auto;">[이유]: ${rd.personalMission.reason}</p>
                        </div>`;
                    }
                }
            }
            container.innerHTML = html || '제출된 결과물이 없습니다.';
        } catch(e) { console.error(e); container.innerHTML = '오류 발생'; }
    }

    // 4. 강력 추천 기능
    document.getElementById('btn-td-freeze')?.addEventListener('click', async () => {
        try {
            await setDoc(doc(db, `classes/${activeClass}/config`, "globalNotice"), {
                type: 'freeze',
                message: '선생님께 집중해주세요! 👀',
                timestamp: Date.now()
            });
            alert('얼음 모드가 활성화되었습니다.');
        } catch(e) { alert('실패'); }
    });

    document.getElementById('btn-td-send-notice')?.addEventListener('click', async () => {
        const msg = document.getElementById('td-notice-input').value.trim();
        if(!msg) return;
        try {
            await setDoc(doc(db, `classes/${activeClass}/config`, "globalNotice"), {
                type: 'alert',
                message: msg,
                timestamp: Date.now()
            });
            alert('공지가 전송되었습니다.');
            document.getElementById('td-notice-input').value = '';
        } catch(e) { alert('실패'); }
    });

    document.getElementById('btn-td-force-pass')?.addEventListener('click', async () => {
        const stage = parseInt(document.getElementById('td-force-pass-stage').value);
        try {
            const depts = getDepartments();
            for(const dept of depts) {
                await setDoc(getDeptDocRef(dept.id), { currentStage: stage }, { merge: true });
            }
            alert(`모든 부서를 ${stage}단계로 강제 이동시켰습니다!`);
        } catch(e) { alert('실패'); }
    });

    document.getElementById('btn-td-reset-class')?.addEventListener('click', async () => {
        if(confirm(`정말 [${activeClass}] 반의 모든 데이터를 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다!`)) {
            // Firestore 하위 컬렉션 삭제 로직은 클라이언트에서 복잡하므로 간단히 부서 초기화 수행
            const depts = getDepartments();
            try {
                for(const dept of depts) {
                    await setDoc(getDeptDocRef(dept.id), { currentStage: 0 });
                    const roles = ['인턴', '사원', '차장', '부장'];
                    for(const role of roles) {
                        await setDoc(getRoleDocRef(dept.id, role), {}); // 빈 객체로 덮어쓰기
                    }
                }
                alert('초기화 완료되었습니다.');
            } catch(e) { alert('초기화 중 오류 발생'); }
        }
    });
};
