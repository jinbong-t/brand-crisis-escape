﻿﻿﻿﻿﻿﻿﻿﻿import { db, collection, doc, setDoc, getDoc, runTransaction, updateDoc, onSnapshot } from './firebase-config.js';
import { PUZZLE_DATA } from './puzzle-data.js';

sessionStorage.clear();

// DOM ?�소
const deptGrid = document.getElementById('dept-grid');
const deptSelection = document.getElementById('department-selection');
const roleSelection = document.getElementById('role-selection');
const selectedDeptName = document.getElementById('selected-dept-name');
const roleCards = document.querySelectorAll('.role-card');
const btnBackToDept = document.getElementById('btn-back-to-dept');
const mainHeader = document.getElementById('main-header');
const currentTeamDisplay = document.getElementById('current-team-display');

// 관리자 모드 DOM
const adminToggleBtn = document.getElementById('admin-toggle-btn');
const adminModal = document.getElementById('admin-modal');
const closeAdminModal = document.getElementById('close-admin-modal');
const adminPinInput = document.getElementById('admin-pin-input');
const btnVerifyPin = document.getElementById('btn-verify-pin');
const pinErrorMsg = document.getElementById('pin-error-msg');
const pinEntrySection = document.getElementById('pin-entry-section');
const adminDashboardSection = document.getElementById('admin-dashboard-section');
const adminDeptList = document.getElementById('admin-dept-list');
const newDeptName = document.getElementById('admin-new-dept');
const btnAddDept = document.getElementById('btn-add-dept');
const btnResetDepts = document.getElementById('btn-reset-depts');

// Splash / Screen 0 DOM
const screenSplash = document.getElementById('screen-splash');
const btnEnterGame = document.getElementById('btn-enter-game');
const geniusModal = document.getElementById('genius-modal');
const screen0 = document.getElementById('screen-0');
const screen1 = document.getElementById('screen-1');
const introModal = document.getElementById('intro-modal');
const introVideo = document.getElementById('intro-video');
const openingCardsContainer = document.getElementById('opening-cards');
const btnUnlock = document.getElementById('btn-unlock');
const diaryModal = document.getElementById('diary-modal');
const diaryText = document.getElementById('diary-text');
const btnSubmitOpening = document.getElementById('btn-submit-opening');
const openingErrorMsg = document.getElementById('opening-error-msg');

// ?�태 관�?
let currentDeptId = sessionStorage.getItem('currentDeptId') || null;
let currentDeptName = sessionStorage.getItem('currentDeptName') || null;
let currentRole = sessionStorage.getItem('currentRole') || null;
let adminClickCount = 0;
let adminClickTimer = null;

function saveSessionState() {
    if (currentDeptId) sessionStorage.setItem('currentDeptId', currentDeptId);
    if (currentDeptName) sessionStorage.setItem('currentDeptName', currentDeptName);
    if (currentRole) sessionStorage.setItem('currentRole', currentRole);
}

function clearSessionState() {
    sessionStorage.removeItem('currentDeptId');
    sessionStorage.removeItem('currentDeptName');
    sessionStorage.removeItem('currentRole');
}

// 기본 부??목록
const DEFAULT_DEPTS = [
    { id: 'dept-1', name: '?�자?�기?��?' },
    { id: 'dept-2', name: '?�재개발부' },
    { id: 'dept-3', name: '?��??�링부' },
    { id: 'dept-4', name: '?�산?�략부' },
    { id: 'dept-5', name: '마�??��?' },
    { id: 'dept-6', name: '?�질관리�?' }
];

// Splash Screen Logic
btnEnterGame.addEventListener('click', () => {
    // 1. 강렬???�업 "?�신??부?�는 무엇?�니�?" ?�우�?
    geniusModal.classList.remove('hidden');
    
    // 2. 2.5�????�업�??�플?�시 ?�면 모두 ?�라지�?Screen 0 ?�장
    setTimeout(() => {
        geniusModal.classList.add('hidden');
        screenSplash.classList.add('hidden');
        screen0.classList.remove('hidden');
    }, 2500);
});

// 부??관�?
function getDepartments() {
    const saved = localStorage.getItem('rebrand_departments');
    if (saved) return JSON.parse(saved);
    localStorage.setItem('rebrand_departments', JSON.stringify(DEFAULT_DEPTS));
    return DEFAULT_DEPTS;
}

function saveDepartments(depts) {
    localStorage.setItem('rebrand_departments', JSON.stringify(depts));
}

// ?�면 ?�더�?
function renderDeptGrid() {
    const depts = getDepartments();
    deptGrid.innerHTML = '';
    depts.forEach(dept => {
        const div = document.createElement('div');
        div.className = 'dept-card';
        div.innerHTML = `<h3>${dept.name}</h3>`;
        div.addEventListener('click', () => selectDepartment(dept));
        deptGrid.appendChild(div);
    });
}

function renderAdminDeptList() {
    const depts = getDepartments();
    adminDeptList.innerHTML = '';
    depts.forEach(dept => {
        const div = document.createElement('div');
        div.className = 'admin-dept-item';
        div.innerHTML = `
            <span>${dept.name}</span>
            <button class="btn-delete" data-id="${dept.id}">??��</button>
        `;
        adminDeptList.appendChild(div);
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const newDepts = getDepartments().filter(d => d.id !== id);
            saveDepartments(newDepts);
            renderAdminDeptList();
            renderDeptGrid();
        });
    });
}

// 부???�택
async function selectDepartment(dept) {
    currentDeptId = dept.id;
    currentDeptName = dept.name;
    
    selectedDeptName.textContent = dept.name;
    deptSelection.classList.add('hidden');
    roleSelection.classList.remove('hidden');

    // Firestore?�서 부??문서가 ?�으�??�성
    const deptRef = doc(db, 'departments', currentDeptId);
    const snap = await getDoc(deptRef);
    if (!snap.exists()) {
        await setDoc(deptRef, {
            name: currentDeptName,
            currentStage: 0,
            startTime: Date.now()
        }, { merge: true });
    }

    saveSessionState();
    checkRoleAvailability();
}

// 직급 ?�성???�태 ?�인
async function checkRoleAvailability() {
    roleCards.forEach(async (card) => {
        const role = card.getAttribute('data-role');
        const roleRef = doc(db, `departments/${currentDeptId}/roles`, role);
        const snap = await getDoc(roleRef);
        
        if (snap.exists() && snap.data().taken) {
            card.disabled = true;
            card.innerHTML = `<h3>${role}</h3><p>(?�택 ?�료)</p>`;
        } else {
            card.disabled = false;
            card.innerHTML = `<h3>${role}</h3><p>${getRoleDesc(role)}</p>`;
        }
    });
}

function getRoleDesc(role) {
    switch(role) {
        case '?�턴': return '직접?�인 ?�서 ?�색';
        case '?�원': return '?�료 ?�석 �?분석';
        case '차장': return '?�심 개념 ?�출';
        case '부장': return '종합 ?�단 �??�출';
    }
}

// 직급 ?�택 (?�랜??��)
roleCards.forEach(card => {
    card.addEventListener('click', async () => {
        if (card.disabled) return;
        const role = card.getAttribute('data-role');
        
        try {
            const roleRef = doc(db, `departments/${currentDeptId}/roles`, role);
            await runTransaction(db, async (transaction) => {
                const docSnap = await transaction.get(roleRef);
                if (docSnap.exists() && docSnap.data().taken) {
                    throw "?��? ?�택??직급?�니??";
                }
                transaction.set(roleRef, { taken: true, timestamp: Date.now() });
            });
            
            // ?�공
            currentRole = role;
            saveSessionState();
            alert(`${role} 직급?�로 ?�작?�니??`);
            
            // ?�이?�리 ?�기???�이지 ?? ?�니메이?�으�??�면 ?�환
            screen0.classList.add('page-turn-out');
            setTimeout(() => {
                screen0.classList.add('hidden');
                screen0.classList.remove('page-turn-out');
                
                screen1.classList.remove('hidden');
                screen1.classList.add('page-turn-in');
                setTimeout(() => screen1.classList.remove('page-turn-in'), 800);
                
                startScreen1(); // ?�면 1(?�프?? ?�팅
            }, 800);
            
        } catch (e) {
            alert(e);
            checkRoleAvailability(); // ?�태 갱신
        }
    });
});

// ?�로가�?
btnBackToDept.addEventListener('click', () => {
    currentDeptId = null;
    currentDeptName = null;
    currentRole = null;
    clearSessionState();
    roleSelection.classList.add('hidden');
    deptSelection.classList.remove('hidden');
});

// ??�� 변�?(로그?�웃 - ?�이???��?)
const btnLogoutRoles = document.querySelectorAll('#btn-logout-role, .btn-logout-role');
btnLogoutRoles.forEach(btn => {
    btn.addEventListener('click', () => {
        if (confirm("?�재 ??��?�서 로그?�웃?�시겠습?�까? (?�?�들??기안 기록?� DB??그�?�?보존?�니??)")) {
            currentRole = null;
            sessionStorage.removeItem('currentRole');
            location.reload();
        }
    });
});

// 관리자 모드 로직 (5�??�릭 ???�성??
adminToggleBtn.addEventListener('click', () => {
    adminClickCount++;
    if (adminClickCount >= 5) {
        adminModal.classList.remove('hidden');
        pinEntrySection.classList.remove('hidden');
        adminDashboardSection.classList.add('hidden');
        adminPinInput.value = '';
        pinErrorMsg.classList.add('hidden');
        adminClickCount = 0;
    }
    clearTimeout(adminClickTimer);
    adminClickTimer = setTimeout(() => { adminClickCount = 0; }, 2000);
});

closeAdminModal.addEventListener('click', () => {
    adminModal.classList.add('hidden');
});

btnVerifyPin.addEventListener('click', () => {
    if (adminPinInput.value === '1234') {
        pinEntrySection.classList.add('hidden');
        adminDashboardSection.classList.remove('hidden');
        renderAdminDeptList();
    } else {
        pinErrorMsg.classList.remove('hidden');
    }
});

btnAddDept.addEventListener('click', () => {
    const name = newDeptName.value.trim();
    if (name) {
        const depts = getDepartments();
        const newId = 'dept-' + Date.now();
        depts.push({ id: newId, name: name });
        saveDepartments(depts);
        newDeptName.value = '';
        renderAdminDeptList();
        renderDeptGrid();
    }
});

btnResetDepts.addEventListener('click', async () => {
    if (confirm("?�말 모든 부???�이?��? 직급 ?�택 기록??초기?�하?�겠?�니�? (?�돌�????�습?�다!)")) {
        const depts = getDepartments();
        const roles = ['?�턴', '?�원', '차장', '부장'];
        for (const dept of depts) {
            try {
                // 부??기본 ?�보 �??�테?��? 초기??
                await setDoc(doc(db, 'departments', dept.id), {
                    name: dept.name,
                    currentStage: 0,
                    managerFinalAnswer1: "",
                    managerFinalAnswer2: "",
                    stage2Pw: "",
                    reasoningWords: [],
                    qrScanned: false
                });
                
                // QR ?�스 ?�태 초기??
                await setDoc(doc(db, 'pieces', dept.id), {
                    unlocked: false
                });

                // 직급 ?�태 초기??
                for (const role of roles) {
                    await setDoc(doc(db, `departments/${dept.id}/roles`, role), { 
                        taken: false,
                        stage1Confirmed: false,
                        stage4Confirmed: false,
                        stage2Ready: false
                    });
                }
            } catch(e) { console.error(e); }
        }
        
        localStorage.removeItem('rebrand_departments');
        clearSessionState();
        currentDeptId = null;
        currentRole = null;
        
        alert("초기?�되?�습?�다.");
        location.reload();
    }
});

// ?�스?�용 빠른 ?�체 초기??버튼
const btnEasyReset = document.getElementById('btn-easy-reset');
if (btnEasyReset) {
    btnEasyReset.addEventListener('click', async () => {
        if (confirm("모든 부??기록�??�이??베이??진행 ?�황???�전??초기?�하�?처음부??0?�계) ?�시 ?�작?�시겠습?�까?")) {
            const depts = getDepartments();
            const roles = ['?�턴', '?�원', '차장', '부장'];
            
            // 모든 부?�의 권한 반환 �??�테?��? 0?�로 ?�돌리기 (?�전 초기??
            for (const dept of depts) {
                try {
                    await setDoc(doc(db, 'departments', dept.id), {
                        name: dept.name,
                        currentStage: 0,
                        managerFinalAnswer1: "",
                        managerFinalAnswer2: "",
                        stage2Pw: "",
                        reasoningWords: [],
                        qrScanned: false
                    });
                    await setDoc(doc(db, 'pieces', dept.id), { unlocked: false });
                } catch(e) { console.error(e); }

                for (const role of roles) {
                    try {
                        await setDoc(doc(db, `departments/${dept.id}/roles`, role), { 
                            taken: false,
                            stage1Confirmed: false,
                            stage4Confirmed: false,
                            stage2Ready: false
                        });
                    } catch(e) { console.error(e); }
                }
            }
            
            localStorage.removeItem('rebrand_departments');
            sessionStorage.clear();
            currentDeptId = null;
            currentRole = null;
            
            alert("?�벽?�게 초기?�되?�습?�다! 깨끗???�태?�서 ?�작?�니??");
            location.reload();
        }
    });
}

// ?�스?�용 ?�천??추론 바로가�?버튼
const debugRoleBtns = document.querySelectorAll('.btn-debug-role');
debugRoleBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
        currentDeptId = 'test-dept'; // ?�의??부??
        currentRole = btn.getAttribute('data-role');
        currentDeptName = '테스트부서';
        sessionStorage.setItem('currentRole', currentRole);
        
        // 부??문서 강제 ?�성 (updateDoc ?�류 방�?)
        try {
            await setDoc(doc(db, 'departments', currentDeptId), {
                name: '테스트부서',
                currentStage: 1
            }, { merge: true });
        } catch(e) { console.error(e); }

        document.getElementById('screen-splash').classList.remove('active');
        
        // ?�식 ??초기??(??과정?�서 onSnapshot???��?�?묶이�??�면 1???�상 ?�팅??
        initApp();
        
        setTimeout(() => showReasoningModal(PUZZLE_DATA.stage1, 2), 800);
    });
});

// ?�이지 ?�킵 로직
const skipButtons = document.querySelectorAll('.btn-skip');
skipButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
        const targetStage = parseInt(btn.getAttribute('data-target'));
        
        if (!currentDeptId || !currentRole) {
            const forceTest = confirm("?�재 ?�택??부?�나 직급???�습?�다! ?�스?�용 '?�스?��???부?? 권한?�로 강제 ?�장?�시겠습?�까?");
            if (forceTest) {
                currentDeptId = 'test-dept-' + Date.now(); // ?�시 부???�성
        currentDeptName = '테스트부서';
                currentRole = '부장';
                saveSessionState();
            } else {
                return;
            }
        }
        
        if (confirm(`${targetStage}?�계�?강제 ?�동?�시겠습?�까?`)) {
            try {
                // 부??문서가 ?�으�??�시 ?�성
                await setDoc(doc(db, 'departments', currentDeptId), {
                    name: currentDeptName,
                    currentStage: targetStage,
                    startTime: Date.now()
                }, { merge: true });
                
                // 모달 ?�기
                adminModal.classList.add('hidden');
                
                // 모든 ?�면 ?�기�?
                document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
                
                if (targetStage === 0) {
                    screen1.classList.remove('hidden');
                    startScreen1();
                } else if (targetStage === 1) {
                    document.getElementById('screen-2').classList.remove('hidden');
                    startScreen2();
                } else if (targetStage === 2) {
                    document.getElementById('screen-3').classList.remove('hidden');
                    startScreen3();
                } else if (targetStage === 3) {
                    document.getElementById('screen-4').classList.remove('hidden');
                    startScreen4();
                } else if (targetStage === 4) {
                    document.getElementById('screen-5').classList.remove('hidden');
                    startScreen5();
                } else {
                    alert(`${targetStage}단계 화면은 아직 공사 중입니다! 뚝딱뚝딱...`);
                }
                
            } catch(e) {
                console.error(e);
            }
        }
    });
});

// ==========================================
// Screen 1: ?�프??로직
// ==========================================
let introParagraphs = [];
let currentIntroIndex = 0;

function startScreen1() {
    mainHeader.classList.remove('hidden');
    currentTeamDisplay.textContent = `${currentDeptName} - ${currentRole}`;

    // ?�프???�토�?모달 준�?
    let rawIntroText = PUZZLE_DATA.opening.introText;
    rawIntroText = rawIntroText.replace('[ROLE]', currentRole);
    introParagraphs = rawIntroText.split('<br><br>');
    currentIntroIndex = 0;
    const container = document.getElementById('intro-text-container');
    container.innerHTML = `<p style="margin-bottom: 1rem; animation: fadeIn 0.5s;">${introParagraphs[0]}</p>`;
    
    const btnNext = document.getElementById('btn-intro-next');
    const btnClose = document.getElementById('close-intro-modal');
    
    btnNext.classList.remove('hidden');
    btnClose.classList.add('hidden');
    
    btnNext.onclick = () => {
        currentIntroIndex++;
        if (currentIntroIndex < introParagraphs.length) {
            const p = document.createElement('p');
            p.style.marginBottom = '1rem';
            p.style.animation = 'fadeIn 0.5s';
            p.innerHTML = introParagraphs[currentIntroIndex];
            container.appendChild(p);
            
            // 컨테?�너 ?�크�?�??�래�?
            container.parentElement.scrollTop = container.parentElement.scrollHeight;
            
            if (currentIntroIndex === introParagraphs.length - 1) {
                btnNext.classList.add('hidden');
                btnClose.classList.remove('hidden');
            }
        }
    };

    introModal.classList.remove('hidden');
    
    // ?�상 ?�동 ?�생 ?�도
    if (introVideo) {
                introVideo.play().catch(e => console.log("자동 재생 방지", e));
    }

    renderOpeningCards();
}

document.getElementById('close-intro-modal').addEventListener('click', () => {
    introModal.classList.add('hidden');
    if (introVideo) {
        introVideo.pause();
    }
});

function renderOpeningCards() {
    openingCardsContainer.innerHTML = '';
    // 초기?�는 무작?�로 ?�어??배치
    const shuffledCards = [...PUZZLE_DATA.opening.cards].sort(() => Math.random() - 0.5);
    
    shuffledCards.forEach(cardData => {
        const card = document.createElement('div');
        card.className = 'flip-card';
        card.setAttribute('draggable', 'true');
        card.dataset.id = cardData.id;
        card.dataset.back = cardData.back;

        // ?�질?�진 ?�낌???�해 ?�간???�덤 ?�전�??�프??부??
        const randomRot = (Math.random() - 0.5) * 10; // -15??~ +15??
        const randomY = (Math.random() - 0.5) * 10;   // -10px ~ +10px
        card.style.transform = `rotate(${randomRot}deg) translateY(${randomY}px)`;
        
        card.innerHTML = `
            <div class="flip-card-inner">
                <div class="flip-card-front" style="background-image: url('splash_bg.png'); background-size: cover; background-position: center; border: 2px solid var(--accent-gold);">
                    <!-- ?�면?� ?�겨�??�태 -->
                    <span style="background: rgba(0,0,0,0.7); padding: 5px; border-radius: 4px; font-weight: bold; color: white;">조사 카드</span>
                </div>
                <div class="flip-card-back" style="display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 1rem;">
                    <span style="font-size: 0.85rem; font-family: 'Noto Sans KR'; font-weight: 500; word-break: keep-all; line-height: 1.5; color: var(--text-main);">${cardData.text}</span>
                    <!-- ?�자???�면??보여주�? ?�고 ?�직 ?�렬 ?�서 체크?�으로만 ?�용?�니??-->
                </div>
            </div>
        `;

        // ?�집�??�벤??
        card.addEventListener('click', () => {
            card.classList.toggle('flipped');
            checkUnlockCondition();
        });

        // ?�래�????�롭 ?�벤??
        card.addEventListener('dragstart', (e) => {
            card.classList.add('dragging');
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            checkUnlockCondition();
        });

        openingCardsContainer.appendChild(card);
    });

    // 컨테?�너 ?�래�??�렬 로직
    openingCardsContainer.addEventListener('dragover', e => {
        e.preventDefault();
        const afterElement = getDragAfterElement(openingCardsContainer, e.clientX);
        const dragging = document.querySelector('.dragging');
        if (afterElement == null) {
            openingCardsContainer.appendChild(dragging);
        } else {
            openingCardsContainer.insertBefore(dragging, afterElement);
        }
    });

    // 모바???�치(?�래�? 지??
    let touchDragging = null;
    openingCardsContainer.addEventListener('touchstart', e => {
        if (e.target.closest('.flip-card')) {
            touchDragging = e.target.closest('.flip-card');
            // ?�치 ?�작 ??바로 ?�집?��? ?�도�??�간???�레??
            setTimeout(() => { if (touchDragging) touchDragging.classList.add('dragging'); }, 100);
        }
    });
    openingCardsContainer.addEventListener('touchmove', e => {
        if (!touchDragging) return;
        e.preventDefault();
        const touch = e.touches[0];
        const afterElement = getDragAfterElement(openingCardsContainer, touch.clientX);
        if (afterElement == null) {
            openingCardsContainer.appendChild(touchDragging);
        } else {
            openingCardsContainer.insertBefore(touchDragging, afterElement);
        }
    });
    openingCardsContainer.addEventListener('touchend', e => {
        if (touchDragging) {
            touchDragging.classList.remove('dragging');
            touchDragging = null;
            checkUnlockCondition();
        }
    });
}

// ?�래�??�치 계산 ?�수
function getDragAfterElement(container, x) {
    const draggableElements = [...container.querySelectorAll('.flip-card:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = x - box.left - box.width / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ?�금 ?�제 조건 검??(?�드백용 ?�각???�과�?
function checkUnlockCondition() {
    const cards = [...openingCardsContainer.querySelectorAll('.flip-card')];
    const isAllFlipped = cards.every(c => c.classList.contains('flipped'));
    const currentOrder = cards.map(c => c.dataset.back).join('');
    
    if (isAllFlipped && currentOrder === '1234') {
        btnUnlock.classList.add('pulse');
    } else {
        btnUnlock.classList.remove('pulse');
    }
}

// ?�금 ?�제 버튼 ?�릭
btnUnlock.addEventListener('click', () => {
    const cards = [...openingCardsContainer.querySelectorAll('.flip-card')];
    const isAllFlipped = cards.every(c => c.classList.contains('flipped'));
    const currentOrder = cards.map(c => c.dataset.back).join('');

    if (!isAllFlipped) {
        alert("모든 조사 카드�??�집???�용???�인?�주?�요!");
        return;
    }
    
    if (currentOrder !== '1234') {
        alert("?�서가 ?�?�습?�다. ?�류 ?�산부???�기까�? ?�경 ?�염??발생?�는 ?�바�??�서?��??�열?�보?�요!");
        return;
    }

    diaryText.textContent = PUZZLE_DATA.opening.diaryText;
    diaryModal.classList.remove('hidden');
});

// ?�이?�리 ???�출
btnSubmitOpening.addEventListener('click', async () => {
    const selected = document.querySelector('input[name="flow-type"]:checked');
    if (!selected) {
        alert('?�을 ?�택?�주?�요.');
        return;
    }

    if (selected.value === PUZZLE_DATA.opening.answer) {
        // ?�답 ??
        openingErrorMsg.classList.add('hidden');
        diaryModal.classList.add('hidden');
        alert('?�답?�니?? 1?�계�??�동?�니??');
        
        // ?�태 ?�데?�트
        try {
            await updateDoc(doc(db, 'departments', currentDeptId), {
                currentStage: 1
            });
        } catch(e) { console.error(e); }

        // 1?�계 ?�면?�로 ?�환
        document.getElementById('screen-1').classList.add('hidden');
        document.getElementById('screen-2').classList.remove('hidden');
        startScreen2();
    } else {
        openingErrorMsg.classList.remove('hidden');
    }
});

// ==========================================
// Screen 2: 1?�계 (?�자?�요?�실) 로직
// ==========================================
function startScreen2(deptData) {
    mainHeader.classList.remove('hidden');
    currentTeamDisplay.textContent = `${currentDeptName} - ${currentRole}`;
    
    document.getElementById('display-current-role').textContent = currentRole;
    
    // 1?�계 ?�토�?모달 ?�우�?
    if (!(deptData && deptData.showStage1Reasoning)) {
        document.getElementById('stage1-story-modal').classList.remove('hidden');
    }
    
    document.getElementById('btn-start-stage1-missions').onclick = () => {
        document.getElementById('stage1-story-modal').classList.add('hidden');
    };
    
    // 미션 1-1 (몽�?�? ?�팅
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
                alert('?�답?�니?? ?�음 미션???�렸?�니??');
                optionsContainer.querySelectorAll('button').forEach(b => b.disabled = true);
                const m2 = document.getElementById('mission-1-2');
                if (m2) {
                    m2.classList.remove('hidden');
                    m2.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            } else {
                alert('?�?�습?�다. ?�서�??�시 ?�인?�보?�요.');
                btn.classList.remove('selected');
            }
        });
        optionsContainer.appendChild(btn);
    });

    // 미션 1-2 (?�단 교집?? ?�팅
    const fabricData = PUZZLE_DATA.stage1.fabricStandards[currentRole];
    document.getElementById('fabric-clue-title').textContent = fabricData.title;
    document.getElementById('fabric-clue-text').textContent = fabricData.text;
    
    const btnSubmitM2 = document.getElementById('btn-submit-mission-1-2');
    if (btnSubmitM2) {
        btnSubmitM2.textContent = currentRole === '부장' ? '최종 ?�인?�기' : '부장'님�?결재 ?�리�?;
    }
    
    document.querySelectorAll('.fabric-btn').forEach(btn => {
        // 복수 ?�택 가?�하?�록 ?��?
        btn.onclick = () => btn.classList.toggle('selected');
    });

    document.getElementById('btn-submit-mission-1-2').onclick = () => {
        const selectedButtons = Array.from(document.querySelectorAll('.fabric-btn.selected'));
        if (selectedButtons.length === 0) {
            alert('?�단???�나 ?�상 ?�택?�주?�요.');
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
            alert(currentRole === '부장' ? '?�답?�니?? ?�벽???�단??골라 최종 ?�인?�셨?�니??' : '?�답?�니?? 부?�님�?기안??무사???�신?�습?�다!');
            document.getElementById('btn-submit-mission-1-2').disabled = true;
            document.getElementById('btn-submit-mission-1-2').textContent = currentRole === '부장' ? '최종 ?�인 ?�료' : '결재 ?�청 ?�료 (기안 ?�신)';
            document.querySelectorAll('.fabric-btn').forEach(b => b.disabled = true);
            
            const m3 = document.getElementById('mission-1-3');
            if (m3) {
                m3.classList.remove('hidden');
                m3.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else {
            alert('?�?�습?�다. ?�분?��? 조건???�시 ?�번 꼼꼼???�인?�세??');
        }
    };

    // 미션 1-3 (?�천??추론) ?�팅
    const reasoningData = PUZZLE_DATA.stage1.reasoning;
    document.getElementById('reasoning-context').innerHTML = reasoningData.context.replace(/\n/g, '<br>');
    document.getElementById('reasoning-role-label').textContent = reasoningData.roleLabels[currentRole];

    if (currentRole === '부장') {
        document.getElementById('manager-montage-panel').classList.remove('hidden');
        document.getElementById('manager-submit-panel').classList.remove('hidden');
        document.getElementById('btn-stage1-confirm-all').style.display = 'none'; // 부?��? ?�체 ?�출 �??�용
        document.getElementById('reasoning-textarea').style.display = 'none'; // 부?��? 모달?�서 ?�력
        document.getElementById('reasoning-role-label').textContent = "부?�님?� ?�?�들??모두 ?�서?� ?�견???�출???�까지 기다??주세?? ?�단??'최종 ?�답 ?�출'???�료?�면 ?�론 창이 ?�립?�다.";
        document.getElementById('reasoning-role-label').style.color = '#ff9f43';
        
        // 부???�용 ?�시�??�???�황 모니?�링
        onSnapshot(collection(db, `departments/${currentDeptId}/roles`), (snapshot) => {
            let allConfirmed = true;
            const requiredRoles = ['?�턴', '?�원', '차장'];
            
            requiredRoles.forEach(role => {
                const statusEl = document.getElementById(`status-${role}`);
                if (!statusEl) return;
                
                const roleDoc = snapshot.docs.find(d => d.id === role);
                const isConfirmed = roleDoc && roleDoc.data().stage1Confirmed;
                const reasoningText = roleDoc ? roleDoc.data().reasoning : "";
                
                const reasoningDisplay = statusEl.querySelector('.reasoning-display');
                if (isConfirmed) {
                    statusEl.classList.add('done');
                    statusEl.querySelector('.status-icon').textContent = 'X';
                    if (reasoningDisplay && reasoningText) {
                        reasoningDisplay.textContent = `"${reasoningText}"`;
                        reasoningDisplay.style.display = 'block';
                    }
                } else {
                    statusEl.classList.remove('done');
                    statusEl.querySelector('.status-icon').textContent = 'X';
                    if (reasoningDisplay) reasoningDisplay.style.display = 'none';
                    allConfirmed = false;
                }
            });
            
            // ?�스???�의�??�해 ?�?�이 모두 ?�출?��? ?�아??부??버튼 ??�� ?�성??
            document.getElementById('btn-submit-stage1').disabled = false;
        });
        
        // 부???�용 최종 ?�출 버튼
        const btnSubmitStage1 = document.getElementById('btn-submit-stage1');
        btnSubmitStage1.onclick = async () => {
            const finalAnswer1 = document.getElementById('manager-final-answer-1').value;
            const finalAnswer2 = document.getElementById('manager-final-answer-2').value;
            const errorMsg = document.getElementById('manager-error-msg');
            
            if (!finalAnswer1 || !finalAnswer2) {
                alert('미션 1(몽�?�?�?미션 2(친환�???최종 ?�답??모두 ?�택?�주?�요.');
                return;
            }
            
            if (finalAnswer1 === 'B' && finalAnswer2 === 'H') {
                errorMsg.classList.add('hidden');
                btnSubmitStage1.disabled = true;
                btnSubmitStage1.textContent = '최종 ?�인 ?�료 (?�천??추론 진행�?';
                
                try {
                    await updateDoc(doc(db, 'departments', currentDeptId), {
                        showStage1Reasoning: true
                    });
                    alert('?�� 모든 ?�?�의 ?�견??종합?�여 진짜 ?�안�??�단??찾았?�니??\n\n?�제 ?�업?�는 \'?�천??추론\' 문제�?부?�원?�과 ?�론?�여 ?�결?�세??');
                    showReasoningModal(PUZZLE_DATA.stage1, 2);
                } catch(e) {
                    console.error(e);
                }
                
            } else {
                errorMsg.classList.remove('hidden');
                errorMsg.textContent = '?�답?�니?? ?�?�들??모아???�서(교집??�??�시 ?�번 분석?�보?�요.';
            }
        };
    } else {
        document.getElementById('manager-montage-panel').classList.add('hidden');
        document.getElementById('manager-submit-panel').classList.add('hidden');
        
        const btnConfirmAll = document.getElementById('btn-stage1-confirm-all');
        if (btnConfirmAll) {
            btnConfirmAll.onclick = async () => {
                const textarea = document.getElementById('reasoning-textarea');
                if (textarea.value.trim().length < 5) {
                    alert('?�견??조금 ???�세???�어??기안?�주?�요.');
                    return;
                }
                
                try {
                    const roleRef = doc(db, `departments/${currentDeptId}/roles`, currentRole);
                    await updateDoc(roleRef, { stage1Confirmed: true, reasoning: textarea.value });
                    
                alert('오류가 발생했습니다.');
                    btnConfirmAll.disabled = true;
                    btnConfirmAll.textContent = '기안 ?�신 ?�료 (부???�인 ?��?�?..)';
                    textarea.disabled = true;
                } catch(e) {
                    console.error(e);
                    alert('기안 ?�신 �??�류가 발생?�습?�다.');
                }
            };
        }
        
        
    }
}

// ==========================================
// Screen 3: 2?�계 (?�턴/봉제?? 로직
// ==========================================
function startScreen3() {
    mainHeader.classList.remove('hidden');
    currentTeamDisplay.textContent = `${currentDeptName} - ${currentRole}`;
    
    document.getElementById('display-current-role-stage2').textContent = currentRole;
    
    // 2?�계 ?�토�?모달 ?�우�?
    const storyModal = document.getElementById('stage2-story-modal');
    storyModal.classList.remove('hidden');
    
    document.getElementById('stage2-intro-text').innerText = PUZZLE_DATA.stage2.intro;
    
    document.getElementById('btn-start-stage2-missions').onclick = () => {
        storyModal.classList.add('hidden');
    };
    
    const puzzleData = PUZZLE_DATA.stage2.puzzles[currentRole];
    
    if (currentRole === '부장') {
        document.getElementById('stage2-employee-panel').classList.add('hidden');
        document.getElementById('stage2-manager-panel').classList.remove('hidden');
        
        // 부???�황??리스??
        onSnapshot(collection(db, `departments/${currentDeptId}/roles`), (snapshot) => {
            const roles = ['?�턴', '?�원', '차장'];
            let allConfirmed = true;
            
            roles.forEach(role => {
                const statusEl = document.getElementById(`status-stage2-${role}`);
                if (!statusEl) return;
                
                const roleDoc = snapshot.docs.find(d => d.id === role);
                const isConfirmed = roleDoc && roleDoc.data().stage2Confirmed;
                
                if (isConfirmed) {
                    statusEl.classList.add('done');
                    statusEl.querySelector('.status-icon').textContent = 'X';
                    statusEl.style.background = 'rgba(0,100,0,0.5)';
                } else {
                    statusEl.classList.remove('done');
                    statusEl.querySelector('.status-icon').textContent = 'X';
                    statusEl.style.background = 'rgba(0,0,0,0.5)';
                    allConfirmed = false;
                }
            });
            
            // ?�스???�의�??�해 부??버튼 ??�� ?�성??
            document.getElementById('btn-submit-stage2').disabled = false;
        });
        
        // 부??금고 가??버튼
        document.getElementById('btn-submit-stage2').onclick = async () => {
            const pw = document.getElementById('manager-vault-pw').value;
            if (pw === PUZZLE_DATA.stage2.puzzles['부장'].answer) {
                document.getElementById('manager-error-msg-stage2').classList.add('hidden');
                
                // Firestore�?먼�? ?�데?�트?�여 ?�른 ?�?�들???�면???�어가�???
                try {
                    await updateDoc(doc(db, 'departments', currentDeptId), {
                        currentStage: 3
                    });
                    
                    alert("?�� 공장 가???�료! 2?�계 ?�출 ?�공!\n\n(3?�계 ?��??�링?�로 ?�동?�니??)");
                } catch(e) {
                    console.error(e);
                }
            } else {
                document.getElementById('manager-error-msg-stage2').classList.remove('hidden');
            }
        };
        
    } else {
        // ?�원/?�턴/차장
        document.getElementById('stage2-employee-panel').classList.remove('hidden');
        document.getElementById('stage2-manager-panel').classList.add('hidden');
        
        document.getElementById('stage2-puzzle-title').textContent = puzzleData.title;
        document.getElementById('stage2-puzzle-text').textContent = puzzleData.text;
        document.getElementById('stage2-puzzle-hint').textContent = `?�트: ${puzzleData.hint}`;
        
        const btnSubmit = document.getElementById('btn-stage2-submit');
        const input = document.getElementById('stage2-answer-input');
        
        btnSubmit.onclick = async () => {
            if (input.value === puzzleData.answer) {
                alert(`?�답?�니?? ?�신??찾�? ?�자??[ ${puzzleData.answer} ] ?�니??\n부?�님?�게 ???�자�??�서?��??�려주세??`);
                btnSubmit.disabled = true;
                btnSubmit.textContent = "?�독 ?�료 (?��?�?";
                input.disabled = true;
                
                // Firebase ?�데?�트
                try {
                    await setDoc(doc(db, `departments/${currentDeptId}/roles`, currentRole), {
                        stage2Confirmed: true,
                        stage2Answer: puzzleData.answer
                    }, { merge: true });
                } catch(e) {
                    console.error(e);
                }
                
            } else {
                alert("비�?번호가 ?�?�습?�다. ?�트�??�시 ?�어보세??");
            }
        };
    }
}

// ==========================================
// Screen 4: 3?�계 (?��??�링?? 로직
// ==========================================
function startScreen4() {
    mainHeader.classList.remove('hidden');
    currentTeamDisplay.textContent = `${currentDeptName} - ${currentRole}`;
    document.getElementById('display-current-role-stage3').textContent = currentRole;
    
    const storyModal = document.getElementById('stage3-story-modal');
    storyModal.classList.remove('hidden');
    document.getElementById('stage3-intro-text').innerText = PUZZLE_DATA.stage3.intro;
    
    document.getElementById('btn-start-stage3-missions').onclick = () => {
        storyModal.classList.add('hidden');
    };
    
    const personalColorData = PUZZLE_DATA.stage3.personalColor[currentRole];
    const bodyTypeData = PUZZLE_DATA.stage3.bodyType[currentRole];
    
    if (currentRole === '부장') {
        document.getElementById('stage3-employee-panel').classList.add('hidden');
        document.getElementById('stage3-manager-panel').classList.remove('hidden');
        
        onSnapshot(collection(db, `departments/${currentDeptId}/roles`), (snapshot) => {
            const roles = ['?�턴', '?�원', '차장'];
            roles.forEach(role => {
                const statusEl = document.getElementById(`status-stage3-${role}`);
                if (!statusEl) return;
                
                const roleDoc = snapshot.docs.find(d => d.id === role);
                const isConfirmed = roleDoc && roleDoc.data().stage3Confirmed;
                
                if (isConfirmed) {
                    statusEl.classList.add('done');
                    statusEl.querySelector('.status-icon').textContent = 'X';
                    statusEl.style.background = 'rgba(0,100,0,0.5)';
                } else {
                    statusEl.classList.remove('done');
                    statusEl.querySelector('.status-icon').textContent = 'X';
                    statusEl.style.background = 'rgba(0,0,0,0.5)';
                }
            });
        });
        
        document.getElementById('stage3-manager-title').textContent = "?�서 1: ?�스??컬러 종합";
        document.getElementById('stage3-manager-text').innerHTML = personalColorData.text.replace(/\n/g, '<br>');
        
        document.getElementById('btn-stage3-manager-submit').onclick = () => {
            const val = document.getElementById('stage3-manager-answer-input').value.replace(/\s+/g, '');
            if (val === personalColorData.answer) {
                alert("?�답?�니?? ?�제 ?�?�들??모�? ?�서�?최종 ?��??�링???�성?�세??");
                document.getElementById('stage3-manager-step1').classList.add('hidden');
                document.getElementById('stage3-manager-step2').classList.remove('hidden');
            } else {
                alert("?�답?�니?? ?�시 ?�각?�보?�요.");
            }
        };

        const draggables = document.querySelectorAll('.paperdoll-item');
        const dropzone = document.getElementById('avatar-dropzone');
        const btnSubmit = document.getElementById('btn-submit-stage3');
        const errorMsg = document.getElementById('manager-error-msg-stage3');
        
        let selectedItems = {};
        
        draggables.forEach(item => {
            if (!item.dataset.originalParent) {
                item.dataset.originalParent = item.parentElement.className;
            }
            
            item.addEventListener('dragstart', (e) => {
                item.classList.add('dragging');
                e.dataTransfer.setData('category', item.getAttribute('data-category'));
                e.dataTransfer.setData('val', item.getAttribute('data-val'));
                if (!item.id) item.id = 'item-' + Date.now() + Math.floor(Math.random()*1000);
                e.dataTransfer.setData('itemId', item.id);
            });
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });
        });
        
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });
        
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            
            const category = e.dataTransfer.getData('category');
            const val = e.dataTransfer.getData('val');
            const itemId = e.dataTransfer.getData('itemId');
            
            if (!category || !val || !itemId) return;
            
            const draggedItem = document.getElementById(itemId);
            if (!draggedItem) return;
            
            const targetSlot = document.getElementById(`slot-${category}`);
            if (targetSlot && targetSlot.children.length > 0) {
                const oldItem = targetSlot.children[0];
                const shelves = document.querySelectorAll('.shelf-items');
                let targetShelf = Array.from(shelves).find(s => s.querySelector(`[data-category="${category}"]`));
                if (!targetShelf && draggedItem.parentElement.classList.contains('shelf-items')) {
                    targetShelf = draggedItem.parentElement;
                }
                if (targetShelf) {
                    targetShelf.appendChild(oldItem);
                }
            }
            
            if(targetSlot) targetSlot.appendChild(draggedItem);
            
            selectedItems[category] = val;
            
            if (selectedItems['line'] && selectedItems['color'] && selectedItems['material'] && selectedItems['pattern']) {
                btnSubmit.disabled = false;
            }
        });
        
        btnSubmit.onclick = async () => {
            if (selectedItems['line'] === '가로선' && 
                selectedItems['color'] === '?�색' && 
            selectedItems['material'] !== '' &&
                selectedItems['pattern'] === '?��?무늬') {
                
                errorMsg.classList.add('hidden');
                alert("?�� ?�벽?�니?? ?�경�??�자?�을 모두 고려??친환�??�류 컬렉?�이 ?�성?�었?�니??\n?�제 ?�업?�는 '?�천??추론' 문제�?부?�원?�과 ?�론?�여 ?�결?�세??");
                btnSubmit.disabled = true;
                
                try {
                    await updateDoc(doc(db, 'departments', currentDeptId), {
                        showStage3Reasoning: true
                    });
                    showReasoningModal(PUZZLE_DATA.stage3, 4);
                } catch(e) {
                    console.error(e);
                }
                
            } else {
                errorMsg.classList.remove('hidden');
            }
        };
        
    } else {
        document.getElementById('stage3-employee-panel').classList.remove('hidden');
        document.getElementById('stage3-manager-panel').classList.add('hidden');
        
        document.getElementById('stage3-puzzle-title').textContent = "?�서 1: ?�스??컬러";
        document.getElementById('stage3-puzzle-text').innerHTML = personalColorData.text.replace(/\n/g, '<br>');
        document.getElementById('stage3-puzzle-hint').textContent = '';
        
        const btnSubmit = document.getElementById('btn-stage3-submit');
        const input = document.getElementById('stage3-answer-input');
        
        let currentStep = 1;
        
        btnSubmit.onclick = async () => {
            if (currentStep === 1) {
                if (input.value.replace(/\s+/g, '') === personalColorData.answer) {
                    alert(`?�확???�서�?찾았?�니??\n?�음 ?�서�??�인?�세??`);
                    currentStep = 2;
                    input.value = '';
                    document.getElementById('stage3-puzzle-title').textContent = "?�서 2: 착시?�과 ?�택";
                    document.getElementById('stage3-puzzle-text').innerHTML = PUZZLE_DATA.stage3.bodyType.memo.replace(/\n/g, '<br>') + '<br><br>' + bodyTypeData.text;
                } else {
                    alert("?�답?�니?? 쿨톤�??�톤 �??�나�??�력?�세??");
                }
            } else if (currentStep === 2) {
                if (input.value.replace(/\s+/g, '') === bodyTypeData.answer) {
                    alert(`모든 ?�서�?찾았?�니?? 부?�님?�게 ?�려주세??`);
                    btnSubmit.disabled = true;
                    btnSubmit.textContent = "?�송 ?�료 (?��?�?";
                    input.disabled = true;
                    
                    try {
                        await setDoc(doc(db, `departments/${currentDeptId}/roles`, currentRole), {
                            stage3Confirmed: true
                        }, { merge: true });
                    } catch(e) {
                        console.error(e);
                    }
                } else {
                    alert("?�답?�니?? ?�시 ?�각?�보?�요!");
                }
            }
        };
        
        
    }
}

// 4?�계: ?�칭???�기실 (T.P.O �??�경?�수)
function startScreen5() {
    document.getElementById('display-current-role-stage4').textContent = currentRole;
    
    // 모달 ?�우�?
    const storyModal = document.getElementById('stage4-story-modal');
    storyModal.classList.remove('hidden');
    document.getElementById('stage4-intro-text').innerHTML = PUZZLE_DATA.stage4.intro.replace(/\n/g, '<br>');
    
    document.getElementById('btn-start-stage4-missions').onclick = () => {
        storyModal.classList.add('hidden');
    };
    
    const puzzleData = PUZZLE_DATA.stage4.puzzles[currentRole];
    
    if (currentRole === '부장') {
        document.getElementById('stage4-employee-panel').classList.add('hidden');
        document.getElementById('stage4-manager-panel').classList.remove('hidden');
        document.getElementById('reasoning-textarea').classList.add('hidden');
        
        // 부??Step 1: TPO ?��?
        document.getElementById('stage4-manager-step1-title').textContent = puzzleData.step1.title;
        document.getElementById('stage4-manager-step1-text').textContent = puzzleData.step1.text;
        
        document.getElementById('btn-stage4-manager-step1').onclick = () => {
            const val = document.getElementById('stage4-manager-step1-input').value.replace(/\s+/g, '');
            if (val === puzzleData.step1.answer) {
                alert('?�답?�니?? ?�제 ?�?�들???�린 ?�서�?모아 5R ?�서�?맞추�?최종 ?�경 ?�수�??�력?�세??');
                document.getElementById('stage4-manager-step1').classList.add('hidden');
                document.getElementById('stage4-5r-puzzle').classList.remove('hidden');
            } else {
                alert('?�답?�니?? ?�시 ?�각?�보?�요.');
            }
        };

        // 5R ?�래�????�롭 로직
        const draggables = document.querySelectorAll('.item-5r');
        const slots = document.querySelectorAll('.slot-5r');
        let selected5R = Array(5).fill(null);
        
        draggables.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('val', item.getAttribute('data-val'));
                item.style.opacity = '0.5';
            });
            item.addEventListener('dragend', () => {
                item.style.opacity = '1';
            });
        });
        
        // ------------------------------------
        // --- 캔버???��?치북 로직 ---
        const canvas = document.getElementById('design-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 5;
            ctx.strokeStyle = 'black';
            
            let isDrawing = false;
            let lastX = 0;
            let lastY = 0;

            function startDrawing(e) {
                isDrawing = true;
                const rect = canvas.getBoundingClientRect();
                lastX = (e.clientX || e.touches[0].clientX) - rect.left;
                lastY = (e.clientY || e.touches[0].clientY) - rect.top;
            }

            function draw(e) {
                if (!isDrawing) return;
                e.preventDefault(); // ?�크�?방�?
                const rect = canvas.getBoundingClientRect();
                const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
                const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

                ctx.beginPath();
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(x, y);
                ctx.stroke();
                lastX = x;
                lastY = y;
            }

            function stopDrawing() {
                isDrawing = false;
            }

            canvas.addEventListener('mousedown', startDrawing);
            canvas.addEventListener('mousemove', draw);
            canvas.addEventListener('mouseup', stopDrawing);
            canvas.addEventListener('mouseout', stopDrawing);

            canvas.addEventListener('touchstart', startDrawing, {passive: false});
            canvas.addEventListener('touchmove', draw, {passive: false});
            canvas.addEventListener('touchend', stopDrawing);

            let currentTool = 'pen'; // 'pen', 'pencil', 'brush', 'eraser'
            
            // ?�상 버튼 ?�벤??
            document.querySelectorAll('.color-btn').forEach(btn => {
                btn.onclick = () => {
                    document.querySelectorAll('.color-btn').forEach(b => b.style.borderColor = 'transparent');
                    btn.style.borderColor = 'white';
                    ctx.strokeStyle = btn.getAttribute('data-color');
                };
            });
            
            // ?�구 버튼 공통 처리 ?�수
            const setToolActive = (activeId) => {
                document.querySelectorAll('.btn-tool').forEach(b => b.style.borderColor = 'transparent');
                document.getElementById(activeId).style.borderColor = 'white';
            };

            // ?�구 버튼 ?�벤??
            document.getElementById('btn-tool-pen').onclick = () => {
                currentTool = 'pen';
                setToolActive('btn-tool-pen');
                ctx.lineWidth = 5;
                ctx.globalAlpha = 1.0;
                // ?�재 ?�택???�상 ?��?
                const activeColor = document.querySelector('.color-btn[style*="border-color: white"]');
                if (activeColor) ctx.strokeStyle = activeColor.getAttribute('data-color');
                else ctx.strokeStyle = '#000000';
            };
            
            document.getElementById('btn-tool-pencil').onclick = () => {
                currentTool = 'pencil';
                setToolActive('btn-tool-pencil');
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.5;
                const activeColor = document.querySelector('.color-btn[style*="border-color: white"]');
                if (activeColor) ctx.strokeStyle = activeColor.getAttribute('data-color');
                else ctx.strokeStyle = '#000000';
            };
            
            document.getElementById('btn-tool-brush').onclick = () => {
                currentTool = 'brush';
                setToolActive('btn-tool-brush');
                ctx.lineWidth = 15;
                ctx.globalAlpha = 0.8;
                const activeColor = document.querySelector('.color-btn[style*="border-color: white"]');
                if (activeColor) ctx.strokeStyle = activeColor.getAttribute('data-color');
                else ctx.strokeStyle = '#000000';
            };

            document.getElementById('btn-tool-eraser').onclick = () => {
                currentTool = 'eraser';
                setToolActive('btn-tool-eraser');
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 20;
                ctx.globalAlpha = 1.0;
            };

            document.getElementById('btn-tool-clear').onclick = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            };
        }
        
        // 캔버??AI 분석 버튼
        const btnAnalyzeCanvas = document.getElementById('btn-analyze-canvas');
        if (btnAnalyzeCanvas) {
            btnAnalyzeCanvas.onclick = () => {
                aiFeedback.classList.remove('hidden');
                aiFeedbackText.textContent = "캔버???��?지�?분석 중입?�다...";
                setTimeout(() => {
                    aiFeedbackText.innerHTML = "<b>[Claude Vision API 분석 결과]</b><br>?�류??질감?????�현?�었?�며, ?�의 ?�름??모델??체형??보완?????�도�??��?치되?�습?�다. 5R �?'?�사?? ?�소�??�용?�기 좋�? ?�자???�태?�니??";
                }, 2500);
            };
        }
        
        // ?�일 ?�로????AI 분석 ?�출 ?�시 로직
        const fileUpload = document.getElementById('design-upload');
        const aiFeedback = document.getElementById('ai-feedback-panel');
        const aiFeedbackText = document.getElementById('ai-feedback-text');
        
        if (fileUpload) {
            fileUpload.addEventListener('change', () => {
                if(fileUpload.files && fileUpload.files[0]) {
                    aiFeedback.classList.remove('hidden');
                    aiFeedbackText.textContent = "?��?지�?분석 중입?�다...";
                    // ?�시 분석 지???�간
                    setTimeout(() => {
                        aiFeedbackText.innerHTML = "<b>[Claude Vision API 분석 결과]</b><br>?�류??질감?????�현?�었?�며, ?�의 ?�름??모델??체형??보완?????�도�??��?치되?�습?�다. 5R �?'?�사?? ?�소�??�용?�기 좋�? ?�자???�태?�니??";
                    }, 2500);
                }
            });
        }
        
        const btnLaunch = document.getElementById('btn-launch-show');
        const scoreInput = document.getElementById('stage4-manager-score-input');
        const scoreFill = document.getElementById('eco-score-fill');
        const scoreText = document.getElementById('eco-score-text');

        let teamCorrectCount = 0;

        function checkManagerStage4Complete() {
            const is5RCorrect = JSON.stringify(selected5R) === JSON.stringify(puzzleData.step2.answer);
            const isScoreCorrect = scoreInput.value.trim() === puzzleData.step3.answer;
            const isTeamDone = teamCorrectCount === 3;
            
            // ?�자 ?�스?�하�??�도�?isTeamDone 조건 ?�시 ?�제
            if (is5RCorrect && isScoreCorrect) {
                btnLaunch.disabled = false;
                btnLaunch.style.background = 'linear-gradient(45deg, #FFD700, #FFA500)';
                btnLaunch.style.color = '#000';
                btnLaunch.style.cursor = 'pointer';
                btnLaunch.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
                btnLaunch.textContent = "?�� ?�칭??가???��";
            } else {
                btnLaunch.disabled = true;
                btnLaunch.style.background = '#555';
                btnLaunch.style.color = '#888';
                btnLaunch.style.cursor = 'not-allowed';
                btnLaunch.style.boxShadow = 'none';
                btnLaunch.textContent = "조건 ?�성 ???�칭??가??";
            }
        }

        slots.forEach((slot, index) => {
            slot.addEventListener('dragover', e => e.preventDefault());
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                const val = e.dataTransfer.getData('val');
                if(val) {
                    slot.textContent = val;
                    slot.style.border = '2px solid #4caf50';
                    slot.style.color = '#fff';
                    selected5R[index] = val;
                    checkManagerStage4Complete();
                }
            });
        });
        
        scoreInput.addEventListener('input', checkManagerStage4Complete);
        
        // ?�?�들???�답 ?�황 ?�시�?감시
        onSnapshot(collection(db, `departments/${currentDeptId}/roles`), (snapshot) => {
            let correctCount = 0;
            
            snapshot.forEach(docSnap => {
                const r = docSnap.id;
                const d = docSnap.data();
                
                if (['?�턴', '?�원', '차장'].includes(r)) {
                    const statusEl = document.getElementById(`status-stage4-${r}`);
                    if (statusEl) {
                        if (d.stage4Confirmed) {
                            statusEl.querySelector('.status-icon').textContent = 'X';
                            correctCount++;
                        } else {
                            statusEl.querySelector('.status-icon').textContent = 'X';
                        }
                    }
                }
            });
            
            teamCorrectCount = correctCount;
            // 게이지 �??�데?�트 (?�???�성??기반)
            const simulatedScore = Math.floor((correctCount / 3) * 100);
            scoreFill.style.width = `${simulatedScore}%`;
            scoreText.textContent = `${simulatedScore} / 100 점`;
            
            checkManagerStage4Complete();
        });
        
        // ?�칭 버튼 ?�릭 (3?�계 ?�료) - ?�제 DB�??�데?�트?�여 모두?�게 ?�칭???�림
        btnLaunch.onclick = async () => {
            try {
                await updateDoc(doc(db, 'departments', currentDeptId), {
                    currentStage: 5
                });
            } catch(e) {
                console.error("?�칭??가???�패:", e);
                alert("?�버 ?�류가 발생?�습?�다. ?�시 ?�도?�주?�요.");
            }
        };
        
        const btnSubmitPersonal = document.getElementById('btn-submit-personal-design');
        if (btnSubmitPersonal) {
            btnSubmitPersonal.onclick = () => {
                const reason = document.getElementById('personal-reason').value;
                const r5 = document.getElementById('personal-5r').value;
                if (!reason || !r5) {
                    alert('?�수 ?�택 ?�소(5R)?� ?�유�??�어주세??');
                    return;
                }
                alert('개인 ?�자???�출???�료?�었?�니?? ?�동 ?�감 ?�이지�??�어갑니??');
                document.getElementById('screen-6').classList.add('hidden');
                document.getElementById('screen-7').classList.remove('hidden');
            };
        }
        
        const btnSubmitReflections = document.getElementById('btn-submit-reflections');
        if (btnSubmitReflections) {
            btnSubmitReflections.onclick = () => {
                const q1 = document.getElementById('reflection-q1').value;
                const q2 = document.getElementById('reflection-q2').value;
                if (!q1 || !q2) {
                    alert('모든 질문???�해주세??');
                    return;
                }
                alert('?�중???�감 감사?�니?? 모든 ?�동??종료?�었?�니??');
                document.getElementById('screen-7').classList.add('hidden');
                
                // ?�필로그 모달 ?�시
                const epilogueModal = document.getElementById('epilogue-modal');
                if (epilogueModal) epilogueModal.classList.remove('hidden');
                
                // ?�필로그 ?�고 ?�명???�면?�로
                const btnCloseEpilogue = document.getElementById('btn-close-epilogue');
                if (btnCloseEpilogue) {
                    btnCloseEpilogue.onclick = () => {
                        epilogueModal.classList.add('hidden');
                        const endingScreen = document.getElementById('screen-ending');
                        if (endingScreen) endingScreen.classList.remove('hidden');
                        
                        // 부?�명 ?�정
    let deptName = '알 수 없음';
                        if (PUZZLE_DATA.departments) {
                            const found = PUZZLE_DATA.departments.find(d => d.id === currentDeptId);
                            if (found) deptName = found.name;
                        }
                        const certDeptName = document.getElementById('certificate-dept-name');
                        if (certDeptName) certDeptName.textContent = deptName;
                        
                        triggerConfetti();
                    };
                }
            };
        }
        // ------------------------------------
        
    } else {
        // ?�턴, ?�원, 차장
        document.getElementById('stage4-employee-panel').classList.remove('hidden');
        document.getElementById('stage4-manager-panel').classList.add('hidden');
        
        const optionsContainer = document.getElementById('stage4-options-container');
        optionsContainer.innerHTML = `
            <h3 id="stage4-puzzle-title" style="color: var(--accent-gold); margin-bottom: 1rem;"></h3>
            <p id="stage4-puzzle-text" style="font-size: 1.1rem; text-align: left; margin-bottom: 1rem; line-height: 1.6;"></p>
            <input type="text" id="stage4-employee-input" placeholder="?�답 ?�력" style="width:100%; padding: 0.8rem; text-align: center; font-size: 1.2rem; border-radius: 8px; border: 1px solid var(--accent-gold); background: rgba(0,0,0,0.6); color: white;">
        `;
        
        const input = document.getElementById('stage4-employee-input');
        const titleEl = document.getElementById('stage4-puzzle-title');
        const textEl = document.getElementById('stage4-puzzle-text');
        
        let currentStep = 'bonus';
        const stepsSequence = ['bonus', 'step1', 'step2', 'step3'];
        let stepIdx = 0;
        
        titleEl.textContent = puzzleData[currentStep].title;
        textEl.textContent = puzzleData[currentStep].text;
        
        const btnSubmit = document.getElementById('btn-stage4-submit');
        const feedback = document.getElementById('stage4-employee-feedback');
        
        btnSubmit.onclick = async () => {
            const val = input.value.replace(/\s+/g, '');
            if (val === puzzleData[currentStep].answer) {
                feedback.classList.add('hidden');
                
                stepIdx++;
                if (stepIdx < stepsSequence.length) {
                    alert('?�답?�니?? ?�음 미션?�로 ?�어갑니??');
                    currentStep = stepsSequence[stepIdx];
                    titleEl.textContent = puzzleData[currentStep].title;
                    textEl.textContent = puzzleData[currentStep].text;
                    input.value = '';
                } else {
                    alert(`모든 기획??검?��? ?�료?�었?�니?? 부?�님 ?�황?�에 반영?�었?�니??`);
                    btnSubmit.disabled = true;
                    btnSubmit.textContent = "기획???�정 ?�료";
                    input.disabled = true;
                    
                    try {
                        await setDoc(doc(db, `departments/${currentDeptId}/roles`, currentRole), {
                            stage4Confirmed: true
                        }, { merge: true });
                    } catch(e) {
                        console.error(e);
                    }
                }
            } else {
                feedback.textContent = "?�못???�답?�니?? ?�시 ?�각?�보?�요.";
                feedback.classList.remove('hidden');
            }
        };
    }
    
    // 부??�??�??모두?�게 ?�용?�는 ?�역 리스??(Stage 5 / QR ?�캔 ?�계 진입)
    onSnapshot(doc(db, 'departments', currentDeptId), (docSnap) => {
        const d = docSnap.data();
        if (d && d.currentStage === 5) {
            const successModal = document.getElementById('stage3-success-modal');
            const pwDisplay = document.getElementById('stage3-revealed-password');
            const guideText = document.getElementById('stage3-guide-text');
            const closeBtn = document.getElementById('btn-close-stage3-success');
            const waitingMsg = document.getElementById('stage3-waiting-msg');

            if (successModal && successModal.classList.contains('hidden')) {
                // pwDisplay 관??로직?� ?�거??
                if (guideText) {
                    guideText.innerHTML = "?�제 ?�?�들�??�께 교실 ?�딘가???�겨???�는 <strong>조각 ?�단</strong>??찾아보세??<br>?�단??찾�? ?? <strong>??��???��??�이 ?�???�구???�?�로</strong> ?�단??붙어 ?�는 QR 코드�??��???카메?�로 ?�캔?�세??";
                }
                
                closeBtn.classList.remove('hidden'); // ?�구???�캔 창을 ?????�음
                if(waitingMsg) waitingMsg.classList.add('hidden');
                
                successModal.classList.remove('hidden');

                // ?�군가 QR??찍어 조각???�득?�면 모두가 6?�계�??�어�?
                const unsub = onSnapshot(doc(db, 'pieces', currentDeptId), (pieceSnap) => {
                    if (pieceSnap.exists() && pieceSnap.data().unlocked) {
                        unsub();
                        document.getElementById('stage3-success-modal').classList.add('hidden');
                        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
                        document.getElementById('screen-6').classList.remove('hidden');
                        document.getElementById('display-current-role-stage6').textContent = currentRole;
                        alert('?�� ?�?�이 조각???�공?�으�?찾았?�니?? ?�음 미션?�로 ?�어갑니??');
                    }
                });
            }
        }
    });

    const btnCloseStage3Success = document.getElementById('btn-close-stage3-success');
    if (btnCloseStage3Success) {
        btnCloseStage3Success.onclick = () => {
            document.getElementById('stage3-success-modal').classList.add('hidden');
            document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
            document.getElementById('screen-qr').classList.remove('hidden');
            document.getElementById('qr-dept-name').textContent = currentDeptName || '알 수 없음';
        };
    }
}

// ??�� (Confetti) ?�니메이???�수
function triggerConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    const colors = ['#fce18a', '#ff726d', '#b48def', '#f4306d'];
    
    for (let i = 0; i < 150; i++) {
        particles.push({
            x: canvas.width / 2,
            y: canvas.height / 2 + 200,
            r: Math.random() * 6 + 4,
            dx: Math.random() * 20 - 10,
            dy: Math.random() * -20 - 10,
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.floor(Math.random() * 10) - 10,
            tiltAngle: 0,
            tiltAngleInc: (Math.random() * 0.07) + 0.05
        });
    }
    
    function draw() {
        requestAnimationFrame(draw);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach((p, i) => {
            p.tiltAngle += p.tiltAngleInc;
            p.y += (Math.cos(p.tiltAngle) + 1 + p.r / 2) / 2;
            p.x += Math.sin(p.tiltAngle) * 2 + p.dx;
            p.dy += 0.5; // gravity
            p.y += p.dy;
            
            ctx.beginPath();
            ctx.lineWidth = p.r;
            ctx.strokeStyle = p.color;
            ctx.moveTo(p.x + p.tilt + p.r, p.y);
            ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r);
            ctx.stroke();
            
            // Remove particles that fall off screen
            if (p.y > canvas.height) {
                particles[i] = { ...p, y: -20, x: Math.random() * canvas.width, dy: 0, dx: 0 };
            }
        });
    }
    draw();
}

// ?�천??추론 모달 로직
function showReasoningModal(stageData, targetStageNum) {
    const rData = stageData.reasoning;
    if (!rData) return;
    
    const modal = document.getElementById('reasoning-modal');
    modal.classList.remove('hidden');
    
    document.getElementById('reasoning-title').textContent = rData.title;
    
    let introHtml = `<p>${rData.intro ? rData.intro.replace(/\\n/g, '<br>') : (rData.context ? rData.context.replace(/\\n/g, '<br>') : '')}</p>`;
    
    if (rData.roleLabels) {
        introHtml += `<ul style="margin-top: 10px; font-size: 0.95rem; color: #aaa;">`;
        for (const [role, label] of Object.entries(rData.roleLabels)) {
            introHtml += `<li style="margin-bottom: 5px;"><b>[${role}]</b>: ${label}</li>`;
        }
        introHtml += `</ul>`;
    }
    
    document.getElementById('reasoning-intro').innerHTML = introHtml;
    
    const keywordsContainer = document.getElementById('reasoning-keywords');
    keywordsContainer.innerHTML = '';
    
    const sentenceContainer = document.getElementById('reasoning-sentence');
    sentenceContainer.innerHTML = '';
    
    const dropzones = [];
    
    if (rData.keywordLock) {
        keywordsContainer.parentElement.style.display = 'block';
        let allKeywords = [];
        if (rData.teamKeywords) {
            Object.values(rData.teamKeywords).forEach(list => allKeywords.push(...list));
        } else if (rData.answers) {
            allKeywords = rData.answers.concat(['a', 'b', 'c']);
        }
        allKeywords = [...new Set(allKeywords)].sort(() => Math.random() - 0.5);
        
        allKeywords.forEach(kw => {
            const div = document.createElement('div');
            div.textContent = kw;
            div.className = 'keyword-chip';
            div.draggable = true;
            div.dataset.val = kw;
            div.style.padding = '8px 12px';
            div.style.background = 'rgba(212,175,55,0.2)';
            div.style.border = '1px solid var(--accent-gold)';
            div.style.borderRadius = '20px';
            div.style.cursor = 'grab';
            
            div.ondragstart = (e) => {
                e.dataTransfer.setData('text/plain', kw);
            };
            keywordsContainer.appendChild(div);
        });
        
        const parts = rData.keywordLock.split(/\\[\\s*\\]/);
        parts.forEach((part, index) => {
            sentenceContainer.appendChild(document.createTextNode(part));
            if (index < parts.length - 1) {
                const dropzone = document.createElement('span');
                dropzone.className = 'reasoning-dropzone';
                dropzone.style.display = 'inline-block';
                dropzone.style.minWidth = '80px';
                dropzone.style.height = '30px';
                dropzone.style.borderBottom = '2px solid var(--accent-gold)';
                dropzone.style.margin = '0 5px';
                dropzone.style.textAlign = 'center';
                dropzone.style.color = 'var(--accent-gold)';
                dropzone.style.fontWeight = 'bold';
                
                dropzone.ondragover = (e) => e.preventDefault();
                dropzone.ondrop = (e) => {
                    e.preventDefault();
                    const data = e.dataTransfer.getData('text/plain');
                    if (data) {
                        dropzone.textContent = data;
                    }
                };
                dropzones.push(dropzone);
                sentenceContainer.appendChild(dropzone);
            }
        });
    } else {
        // ?�워???�물?��? ?�는 경우 (?�순 ?�론)
        keywordsContainer.parentElement.style.display = 'none';
        sentenceContainer.innerHTML = `
            <p style="color: var(--accent-gold); text-align: center; margin-bottom: 1rem;">?�?�들�?충분???�론??진행???? 부?�님??<b>[?�의 ?�료]</b> 버튼???�러주세??</p>
            <textarea id="reasoning-summary" rows="4" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid var(--accent-gold); color: white; border-radius: 5px; margin-bottom: 1rem; box-sizing: border-box; font-family: inherit;" placeholder="?�??최종 ?�의 ?�용???�곳???�유�?�� ?�리?�세??.."></textarea>
        `;
    }
    
    const btnSubmit = document.getElementById('btn-submit-reasoning');
    btnSubmit.classList.remove('hidden');
    btnSubmit.style.display = 'inline-block';
            btnSubmit.textContent = rData.keywordLock ? '제출 완료' : '최종 제출';
    btnSubmit.onclick = async () => {
        // (������ ���� �Ϸ� ����)



        
        let isCorrect = true;
        if (rData.keywordLock && rData.answers) {
            const userAnswers = dropzones.map(d => d.textContent.trim());
            const correctAnswers = rData.answers;
            for (let i = 0; i < correctAnswers.length; i++) {
                if (userAnswers[i] !== correctAnswers[i]) {
                    isCorrect = false;
                    break;
                }
            }
        }
        
        if (isCorrect) {
            // ?�약 ?�스?��? ?�으�?DB???�??
            const summaryEl = document.getElementById('reasoning-summary');
            if (summaryEl && summaryEl.value.trim() !== '') {
                try {
                    await setDoc(doc(db, `departments/${currentDeptId}/reasoning`, `stage${targetStageNum-1}`), {
                        roleGroup: currentRole,
                        summary: summaryEl.value.trim()
                    }, { merge: true });
                } catch(e) { console.error("?�약 ?�???�패:", e); }
            }

            alert('?�� ?�의 �??�천??추론???�료?�었?�니?? ?�음 ?�계�??�동?�니??');
            modal.classList.add('hidden');
            
            try {
                await updateDoc(doc(db, 'departments', currentDeptId), {
                    currentStage: targetStageNum,
                    showStage1Reasoning: false,
                    showStage3Reasoning: false
                });
            } catch(e) {
                console.error("DB ?�데?�트 ?�패:", e);
                alert('?�버?� ?�결??문제가 ?�습?�다. ?�시 ???�시 ?�도?�주?�요.');
            }
        } else {
            alert('?�?�습?�다! 문맥???�시 ?�악?�여 ?�바�??�워?��? 채워보세??');
        }
    };
}

// 초기???�수
async function initApp() {
    renderDeptGrid();
    
    // QR ?�캔?�로 진입?�는지 ?�인 (?qr=true)
    const urlParams = new URLSearchParams(window.location.search);
    const isQrScan = urlParams.get('qr') === 'true';

    // ?�션???�아?�다�??�당 ?�계�?바로 복구
    if (currentDeptId && currentRole) {
        try {
            // 부?�의 currentStage 변경을 ?�시간으�?감�??�여 ?�면 ?�동 ?�환
            onSnapshot(doc(db, 'departments', currentDeptId), (snap) => {
                if (snap.exists()) {
                    const d = snap.data();
                    const stage = d.currentStage || 0;
                    deptSelection.classList.add('hidden');
                    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                    document.querySelectorAll('.modal').forEach(m => { if (m.id !== 'reasoning-modal') m.classList.add('hidden'); });
                    
                    // QR ?�캔 진입??경우 바로 QR ?�면?�로 ?�동 (부?�만 ?�용)
                    if (isQrScan) {
                        if (currentRole !== '부장') {
                            alert('QR ?�캔�??�호 ?�력?� 부?�님�??????�습?�다!\n부?�님???��??�으�??�캔?�주?�요.');
                            // ?�플?�시???��??�면?�로 ?�려보냄 (?�선 0?�계 ?�면 ?��?)
                            document.getElementById('screen-0').classList.remove('hidden');
                            return;
                        }
                        document.getElementById('screen-qr').classList.remove('hidden');
            document.getElementById('qr-dept-name').textContent = currentDeptName || '알 수 없음';
                        return;
                    }

                    if (stage === 0) {
                        screen1.classList.remove('hidden');
                        startScreen1();
                    } else if (stage === 1) {
                        const s2 = document.getElementById('screen-2');
                        if (s2) {
                            s2.classList.remove('hidden');
                            startScreen2();
                            if (d && d.showStage1Reasoning) {
                                showReasoningModal(PUZZLE_DATA.stage1, 2);
                            }
                        }
                    } else if (stage === 2) {
                        const s3 = document.getElementById('screen-3');
                        if (s3) {
                            s3.classList.remove('hidden');
                            startScreen3();
                        }
                    } else if (stage === 3) {
                        const s4 = document.getElementById('screen-4');
                        if (s4) {
                            s4.classList.remove('hidden');
                            startScreen4();
                            if (d && d.showStage3Reasoning) {
                                showReasoningModal(PUZZLE_DATA.stage3, 4);
                            }
                        }
                    } else if (stage >= 4) {
                        const s5 = document.getElementById('screen-5');
                        if (s5) {
                            s5.classList.remove('hidden');
                            startScreen5();
                        }
                    }
                } else {
                    // ?�이?�베?�스??부??문서가 ?�으�?초기?�된 경우) ?�션 ?�림
                    clearSessionState();
                    currentDeptId = null;
                    currentRole = null;
                    location.reload();
                }
            });
            
        } catch(e) { 
            console.error(e); 
            clearSessionState();
        }
    }
}

// Removed dev test buttons logic to ensure clean production feel

// ?�체 ?�면 모아보기 (God Mode)
const devGodModeBtn = document.getElementById('dev-god-mode');
if (devGodModeBtn) {
    let godMode = false;
    devGodModeBtn.addEventListener('click', () => {
        godMode = !godMode;
        if (godMode) {
            devGodModeBtn.textContent = '???�래?��?복구?�기 (?�로고침)';
            devGodModeBtn.style.background = '#ff0055';
            
            // ?�더 ?�시
            document.getElementById('main-header').classList.remove('hidden');
            
            // 모든 ?�크�??�시 (?�플?�시, 부???�택 ?�외)
            document.getElementById('screen-splash').classList.add('hidden');
            document.getElementById('dept-selection').classList.add('hidden');
            
            document.querySelectorAll('.screen').forEach(s => {
                if (s.id !== 'screen-splash' && s.id !== 'dept-selection') {
                    s.classList.remove('hidden');
                    s.style.borderBottom = '10px dashed #d4af37';
                    s.style.paddingBottom = '50px';
                    s.style.marginBottom = '50px';
                }
            });
            
            // 모든 부???�???�널, 모달 ???��? ?�제
            const hideables = [
                'manager-montage-panel', 'manager-submit-panel',
                'stage2-employee-panel', 'stage2-manager-panel',
                'stage3-employee-panel', 'stage3-manager-panel',
                'stage4-employee-panel', 'stage4-manager-panel',
                'mission-1-3'
            ];
            hideables.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.remove('hidden');
            });
            
            // ?�토�?모달창들???�라?�으�??�시
            document.querySelectorAll('.modal').forEach(m => {
                m.classList.remove('hidden');
                m.style.position = 'relative';
                m.style.background = 'rgba(0,0,0,0.5)';
                m.style.border = '2px solid #d4af37';
                m.style.padding = '20px';
                m.style.margin = '20px 0';
                m.style.zIndex = '1';
                m.style.height = 'auto';
            });
            
        } else {
            location.reload();
        }
    });
}

// --- QR 조각 찾기 ?�면 로직 ---
const btnSubmitQr = document.getElementById('btn-submit-qr');
const qrPasswordInput = document.getElementById('qr-password-input');
const qrErrorMsg = document.getElementById('qr-error-msg');
const qrSuccessPanel = document.getElementById('qr-success-panel');
const btnGoToPersonal = document.getElementById('btn-go-to-personal');
const btnViewDashboard = document.getElementById('btn-view-dashboard');

if (btnSubmitQr) {
    btnSubmitQr.addEventListener('click', async () => {
        const inputPw = qrPasswordInput.value.trim();
        const correctPw = PUZZLE_DATA.qrMessages[currentDeptId];
        
        // ?�력값과 ?�답?�서 ?�어?�기�?모두 ?�거?�여 비교 (관?�?�게)
        if (inputPw.replace(/\s+/g, '') === correctPw.replace(/\s+/g, '')) {
            qrErrorMsg.classList.add('hidden');
            btnSubmitQr.classList.add('hidden');
            qrPasswordInput.disabled = true;
            qrSuccessPanel.classList.remove('hidden');
            
            // pieces 컬렉???�데?�트
            try {
                await setDoc(doc(db, 'pieces', currentDeptId), { 
                    unlocked: true, 
                    unlockedAt: new Date().toISOString()
                }, { merge: true });
            } catch (e) {
                console.error('Error updating piece:', e);
            }
        } else {
            qrErrorMsg.classList.remove('hidden');
            qrPasswordInput.value = '';
            qrPasswordInput.focus();
        }
    });
}

if (btnGoToPersonal) {
    btnGoToPersonal.addEventListener('click', () => {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
        document.getElementById('screen-6').classList.remove('hidden');
        document.getElementById('display-current-role-stage6').textContent = currentRole;
    });
}

// --- ?�?�보??로직 ---
const btnOpenDashboard = document.getElementById('btn-open-dashboard');
const btnCloseDashboard = document.getElementById('btn-close-dashboard');
const screenDashboard = document.getElementById('screen-dashboard');
const fabricPuzzleContainer = document.getElementById('fabric-puzzle-container');
let dashboardUnsubscribe = null;

function renderDashboardSlots() {
    const depts = JSON.parse(localStorage.getItem('rebrand_departments') || '[]');
    fabricPuzzleContainer.innerHTML = '';
    depts.forEach((d, idx) => {
        const slot = document.createElement('div');
        slot.className = 'fabric-slot';
        slot.setAttribute('data-slot', idx);
        slot.id = `dashboard-slot-${d.id}`;
        fabricPuzzleContainer.appendChild(slot);
    });
}

function openDashboard() {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    screenDashboard.classList.remove('hidden');
    renderDashboardSlots();
    
    // Firestore pieces 컬렉???�시�?구독
    dashboardUnsubscribe = onSnapshot(collection(db, 'pieces'), (snapshot) => {
        let unlockedCount = 0;
        const totalDepts = JSON.parse(localStorage.getItem('rebrand_departments') || '[]').length;
        
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.unlocked) {
                const slot = document.getElementById(`dashboard-slot-${docSnap.id}`);
                if (slot && !slot.classList.contains('unlocked')) {
                    slot.classList.add('unlocked');
                }
                unlockedCount++;
            }
        });
        
        // 모두 ?�제?�었?????�출
        if (unlockedCount >= totalDepts && totalDepts > 0) {
            setTimeout(() => {
                fabricPuzzleContainer.classList.add('scale-up-anim');
                const finalMsg = document.getElementById('dashboard-final-message');
                finalMsg.classList.remove('hidden');
                
                // ?�시�??�드코딩??메시지 (게이지 ?�동 ??
                document.getElementById('dashboard-final-text').innerHTML = "고마?�요, ?�러�? ?�러분이 지켜낸 만큼?� 분명???�라졌어?? ?�음?�는 조금 ?? 지?��??�한 ?�택 쪽으�??�?�이 기울�?좋겠?�요.";
            }, 1000);
        }
    });
}

if (btnOpenDashboard) btnOpenDashboard.addEventListener('click', () => {
    document.getElementById('admin-modal').classList.add('hidden');
    openDashboard();
});
if (btnViewDashboard) btnViewDashboard.addEventListener('click', openDashboard);
if (btnCloseDashboard) btnCloseDashboard.addEventListener('click', () => {
    if (dashboardUnsubscribe) dashboardUnsubscribe();
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    if (currentDeptId) {
        // ?�래 ?�던 ?�면?�로 ?�아가�?(?�?�보?�는 관리자??QR ?�료 ?�면?�서�??�어??
        // ?�기???�플?�시??QR ?�면?�로 보내버림
        if (qrSuccessPanel && !qrSuccessPanel.classList.contains('hidden')) {
            document.getElementById('screen-qr').classList.remove('hidden');
        } else {
            document.getElementById('screen-0').classList.remove('hidden');
        }
    } else {
        document.getElementById('screen-splash').classList.remove('hidden');
    }
});

initApp();

const btnFloatingReset = document.getElementById('btn-secret-reset');
if (btnFloatingReset) {
    btnFloatingReset.addEventListener('click', () => {
        if (confirm('모든 기기???�션??초기?�하�?처음 ?�면?�로 ?�아가?�겠?�니�?')) {
            sessionStorage.clear();
            location.href = location.pathname;
        }
    });
}


const btnSecretSkip = document.getElementById('btn-secret-skip');
if (btnSecretSkip) {
    btnSecretSkip.addEventListener('click', async () => {
        if (!currentDeptId) return;
        try {
            const snap = await getDoc(doc(db, 'departments', currentDeptId));
            if (snap.exists()) {
                const stage = snap.data().currentStage || 0;
                let nextStage = stage + 1;
                if (nextStage > 5) nextStage = 5;
                await updateDoc(doc(db, 'departments', currentDeptId), {
                    currentStage: nextStage
                });
            }
        } catch(e) { console.error(e); }
    });
}



