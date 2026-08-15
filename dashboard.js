import { db, collection, doc, setDoc, getDoc, updateDoc, onSnapshot, getDocs, deleteDoc } from './firebase-config.js';

// 기본 활성 학급
let activeClass = '3-1';
const classInput = document.getElementById('class-input');
const currentTabTitle = document.getElementById('current-tab-title');

// 초기 학급 세팅
classInput.value = activeClass;

document.getElementById('btn-set-class')?.addEventListener('click', () => {
    const newClass = classInput.value.trim();
    if (newClass) {
        activeClass = newClass;
        alert(`현재 모니터링 학급이 [${activeClass}]로 변경되었습니다.`);
        // TODO: 구독 새로고침
        initDashboard();
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
    window.close(); // 새 탭으로 열렸을 경우 닫기
});

// ==========================================
// 파이어베이스 데이터 구독 및 렌더링
// ==========================================
let unsubscribes = [];

function initDashboard() {
    // 기존 구독 해제
    unsubscribes.forEach(unsub => unsub());
    unsubscribes = [];

    renderTeamTab();
    renderStatusTab();
    renderResultsTab();
    renderControlTab();
}

function renderTeamTab() {
    const container = document.getElementById('td-dept-list');
    container.innerHTML = '';
    
    // 부서 목록은 하드코딩 또는 파이어베이스에서 읽어오기
    const depts = [
        {id: '기획부', name: '기획부'},
        {id: '디자인부', name: '디자인부'},
        {id: '마케팅부', name: '마케팅부'},
        {id: '영업부', name: '영업부'}
    ];

    depts.forEach(dept => {
        const card = document.createElement('div');
        card.className = 'dept-card';
        card.innerHTML = `
            <h3>${dept.name}</h3>
            <input type="text" placeholder="사원 학번/이름 (예: 30101 홍길동)" class="member-input" data-dept="${dept.id}" data-role="사원">
            <input type="text" placeholder="대리 학번/이름" class="member-input" data-dept="${dept.id}" data-role="대리">
            <input type="text" placeholder="과장 학번/이름" class="member-input" data-dept="${dept.id}" data-role="과장">
            <input type="text" placeholder="차장 학번/이름" class="member-input" data-dept="${dept.id}" data-role="차장">
            <input type="text" placeholder="부장 학번/이름" class="member-input" data-dept="${dept.id}" data-role="부장">
        `;
        container.appendChild(card);
    });

    // TODO: Firestore에서 기존 매핑 데이터를 불러와 input에 채우고, 변경 시 Firestore에 저장하는 이벤트 연동
}

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
        
        // 강제 패스 select 요소도 업데이트
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

function renderResultsTab() {
    // 캔버스 결과물 등 (추후 구현)
    const container = document.getElementById('td-results-gallery');
    container.innerHTML = '<p style="color: var(--text-muted);">제출된 결과물이 없습니다.</p>';
}

function renderControlTab() {
    // 강제 패스
    document.getElementById('btn-force-pass')?.addEventListener('click', async () => {
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
    });

    // 전체 공지
    document.getElementById('btn-send-notice')?.addEventListener('click', async () => {
        const msg = document.getElementById('notice-input').value.trim();
        if (!msg) return;
        
        try {
            // notice 컬렉션에 문서를 추가하거나 업데이트하여 학생들이 감지하도록 설계
            const ref = doc(db, `classes/${activeClass}/global`, 'notice');
            await setDoc(ref, { message: msg, timestamp: Date.now() });
            alert('공지가 전송되었습니다.');
            document.getElementById('notice-input').value = '';
        } catch(e) {
            console.error(e);
            alert("전송 실패");
        }
    });
    
    // 데이터 초기화
    document.getElementById('btn-reset-class')?.addEventListener('click', async () => {
        if(confirm(`정말 [${activeClass}] 반의 모든 데이터를 삭제하시겠습니까? 복구할 수 없습니다!`)) {
            alert('파이어베이스의 departments 하위 문서들을 삭제하는 로직을 추가해야 합니다.');
            // (Cloud Functions나 일괄 삭제 로직 필요)
        }
    });
}

// 최초 실행
initDashboard();
