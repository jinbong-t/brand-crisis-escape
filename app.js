import { db, collection, doc, setDoc, getDoc, runTransaction, updateDoc, onSnapshot } from './firebase-config.js';
import { PUZZLE_DATA } from './puzzle-data.js';

sessionStorage.clear();

// DOM ?”ì†Œ
const deptGrid = document.getElementById('dept-grid');
const deptSelection = document.getElementById('department-selection');
const roleSelection = document.getElementById('role-selection');
const selectedDeptName = document.getElementById('selected-dept-name');
const roleCards = document.querySelectorAll('.role-card');
const btnBackToDept = document.getElementById('btn-back-to-dept');
const mainHeader = document.getElementById('main-header');
const currentTeamDisplay = document.getElementById('current-team-display');

// ê´€ë¦¬ì ëª¨ë“œ DOM
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

// ?íƒœ ê´€ë¦?
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

// ê¸°ë³¸ ë¶€??ëª©ë¡
const DEFAULT_DEPTS = [
    { id: 'dept-1', name: '?”ì?¸ê¸°?ë?' },
    { id: 'dept-2', name: '?Œì¬ê°œë°œë¶€' },
    { id: 'dept-3', name: '?¤í??¼ë§ë¶€' },
    { id: 'dept-4', name: '?ì‚°?„ëµë¶€' },
    { id: 'dept-5', name: 'ë§ˆì??…ë?' },
    { id: 'dept-6', name: '?ˆì§ˆê´€ë¦¬ë?' }
];

// Splash Screen Logic
btnEnterGame.addEventListener('click', () => {
    // 1. ê°•ë ¬???ì—… "?¹ì‹ ??ë¶€?œëŠ” ë¬´ì—‡?…ë‹ˆê¹?" ?„ìš°ê¸?
    geniusModal.classList.remove('hidden');
    
    // 2. 2.5ì´????ì—…ê³??¤í”Œ?˜ì‹œ ?”ë©´ ëª¨ë‘ ?¬ë¼ì§€ê³?Screen 0 ?±ì¥
    setTimeout(() => {
        geniusModal.classList.add('hidden');
        screenSplash.classList.add('hidden');
        screen0.classList.remove('hidden');
    }, 2500);
});

// ë¶€??ê´€ë¦?
function getDepartments() {
    const saved = localStorage.getItem('rebrand_departments');
    if (saved) return JSON.parse(saved);
    localStorage.setItem('rebrand_departments', JSON.stringify(DEFAULT_DEPTS));
    return DEFAULT_DEPTS;
}

function saveDepartments(depts) {
    localStorage.setItem('rebrand_departments', JSON.stringify(depts));
}

// ?”ë©´ ?Œë”ë§?
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
            <button class="btn-delete" data-id="${dept.id}">?? œ</button>
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

// ë¶€??? íƒ
async function selectDepartment(dept) {
    currentDeptId = dept.id;
    currentDeptName = dept.name;
    
    selectedDeptName.textContent = dept.name;
    deptSelection.classList.add('hidden');
    roleSelection.classList.remove('hidden');

    // Firestore?ì„œ ë¶€??ë¬¸ì„œê°€ ?†ìœ¼ë©??ì„±
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

// ì§ê¸‰ ?œì„±???íƒœ ?•ì¸
async function checkRoleAvailability() {
    roleCards.forEach(async (card) => {
        const role = card.getAttribute('data-role');
        const roleRef = doc(db, `departments/${currentDeptId}/roles`, role);
        const snap = await getDoc(roleRef);
        
        if (snap.exists() && snap.data().taken) {
            card.disabled = true;
            card.innerHTML = `<h3>${role}</h3><p>(? íƒ ?„ë£Œ)</p>`;
        } else {
            card.disabled = false;
            card.innerHTML = `<h3>${role}</h3><p>${getRoleDesc(role)}</p>`;
        }
    });
}

function getRoleDesc(role) {
    switch(role) {
        case '?¸í„´': return 'ì§ì ‘?ì¸ ?¨ì„œ ?ìƒ‰';
        case '?¬ì›': return '?ë£Œ ?´ì„ ë°?ë¶„ì„';
        case 'ì°¨ì¥': return '?µì‹¬ ê°œë… ?„ì¶œ';
        case 'ë¶€??: return 'ì¢…í•© ?ë‹¨ ë°??œì¶œ';
    }
}

// ì§ê¸‰ ? íƒ (?¸ëœ??…˜)
roleCards.forEach(card => {
    card.addEventListener('click', async () => {
        if (card.disabled) return;
        const role = card.getAttribute('data-role');
        
        try {
            const roleRef = doc(db, `departments/${currentDeptId}/roles`, role);
            await runTransaction(db, async (transaction) => {
                const docSnap = await transaction.get(roleRef);
                if (docSnap.exists() && docSnap.data().taken) {
                    throw "?´ë? ? íƒ??ì§ê¸‰?…ë‹ˆ??";
                }
                transaction.set(roleRef, { taken: true, timestamp: Date.now() });
            });
            
            // ?±ê³µ
            currentRole = role;
            saveSessionState();
            alert(`${role} ì§ê¸‰?¼ë¡œ ?œì‘?©ë‹ˆ??`);
            
            // ?¤ì´?´ë¦¬ ?˜ê¸°???˜ì´ì§€ ?? ? ë‹ˆë©”ì´?˜ìœ¼ë¡??”ë©´ ?„í™˜
            screen0.classList.add('page-turn-out');
            setTimeout(() => {
                screen0.classList.add('hidden');
                screen0.classList.remove('page-turn-out');
                
                screen1.classList.remove('hidden');
                screen1.classList.add('page-turn-in');
                setTimeout(() => screen1.classList.remove('page-turn-in'), 800);
                
                startScreen1(); // ?”ë©´ 1(?¤í”„?? ?‹íŒ…
            }, 800);
            
        } catch (e) {
            alert(e);
            checkRoleAvailability(); // ?íƒœ ê°±ì‹ 
        }
    });
});

// ?¤ë¡œê°€ê¸?
btnBackToDept.addEventListener('click', () => {
    currentDeptId = null;
    currentDeptName = null;
    currentRole = null;
    clearSessionState();
    roleSelection.classList.add('hidden');
    deptSelection.classList.remove('hidden');
});

// ??•  ë³€ê²?(ë¡œê·¸?„ì›ƒ - ?°ì´??? ì?)
const btnLogoutRoles = document.querySelectorAll('#btn-logout-role, .btn-logout-role');
btnLogoutRoles.forEach(btn => {
    btn.addEventListener('click', () => {
        if (confirm("?„ì¬ ??• ?ì„œ ë¡œê·¸?„ì›ƒ?˜ì‹œê² ìŠµ?ˆê¹Œ? (?€?ë“¤??ê¸°ì•ˆ ê¸°ë¡?€ DB??ê·¸ë?ë¡?ë³´ì¡´?©ë‹ˆ??)")) {
            currentRole = null;
            sessionStorage.removeItem('currentRole');
            location.reload();
        }
    });
});

// ê´€ë¦¬ì ëª¨ë“œ ë¡œì§ (5ë²??´ë¦­ ???œì„±??
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
    if (confirm("?•ë§ ëª¨ë“  ë¶€???°ì´?°ì? ì§ê¸‰ ? íƒ ê¸°ë¡??ì´ˆê¸°?”í•˜?œê² ?µë‹ˆê¹? (?˜ëŒë¦????†ìŠµ?ˆë‹¤!)")) {
        const depts = getDepartments();
        const roles = ['?¸í„´', '?¬ì›', 'ì°¨ì¥', 'ë¶€??];
        for (const dept of depts) {
            try {
                // ë¶€??ê¸°ë³¸ ?•ë³´ ë°??¤í…Œ?´ì? ì´ˆê¸°??
                await setDoc(doc(db, 'departments', dept.id), {
                    name: dept.name,
                    currentStage: 0,
                    managerFinalAnswer1: "",
                    managerFinalAnswer2: "",
                    stage2Pw: "",
                    reasoningWords: [],
                    qrScanned: false
                });
                
                // QR ?¼ìŠ¤ ?íƒœ ì´ˆê¸°??
                await setDoc(doc(db, 'pieces', dept.id), {
                    unlocked: false
                });

                // ì§ê¸‰ ?íƒœ ì´ˆê¸°??
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
        
        alert("ì´ˆê¸°?”ë˜?ˆìŠµ?ˆë‹¤.");
        location.reload();
    }
});

// ?ŒìŠ¤?¸ìš© ë¹ ë¥¸ ?„ì²´ ì´ˆê¸°??ë²„íŠ¼
const btnEasyReset = document.getElementById('btn-easy-reset');
if (btnEasyReset) {
    btnEasyReset.addEventListener('click', async () => {
        if (confirm("ëª¨ë“  ë¶€??ê¸°ë¡ê³??°ì´??ë² ì´??ì§„í–‰ ?í™©???„ì „??ì´ˆê¸°?”í•˜ê³?ì²˜ìŒë¶€??0?¨ê³„) ?¤ì‹œ ?œì‘?˜ì‹œê² ìŠµ?ˆê¹Œ?")) {
            const depts = getDepartments();
            const roles = ['?¸í„´', '?¬ì›', 'ì°¨ì¥', 'ë¶€??];
            
            // ëª¨ë“  ë¶€?œì˜ ê¶Œí•œ ë°˜í™˜ ë°??¤í…Œ?´ì? 0?¼ë¡œ ?˜ëŒë¦¬ê¸° (?„ì „ ì´ˆê¸°??
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
            
            alert("?„ë²½?˜ê²Œ ì´ˆê¸°?”ë˜?ˆìŠµ?ˆë‹¤! ê¹¨ë—???íƒœ?ì„œ ?œì‘?©ë‹ˆ??");
            location.reload();
        }
    });
}

// ?ŒìŠ¤?¸ìš© ?¤ì²œ??ì¶”ë¡  ë°”ë¡œê°€ê¸?ë²„íŠ¼
const debugRoleBtns = document.querySelectorAll('.btn-debug-role');
debugRoleBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
        currentDeptId = 'test-dept'; // ?„ì˜??ë¶€??
        currentRole = btn.getAttribute('data-role');
        currentDeptName = '?ŒìŠ¤?¸ë???;
        sessionStorage.setItem('currentRole', currentRole);
        
        // ë¶€??ë¬¸ì„œ ê°•ì œ ?ì„± (updateDoc ?¤ë¥˜ ë°©ì?)
        try {
            await setDoc(doc(db, 'departments', currentDeptId), {
                name: '?ŒìŠ¤?¸ë???,
                currentStage: 1
            }, { merge: true });
        } catch(e) { console.error(e); }

        document.getElementById('screen-splash').classList.remove('active');
        
        // ?•ì‹ ??ì´ˆê¸°??(??ê³¼ì •?ì„œ onSnapshot???œë?ë¡?ë¬¶ì´ê³??”ë©´ 1???•ìƒ ?‹íŒ…??
        initApp();
        
        setTimeout(() => showReasoningModal(PUZZLE_DATA.stage1, 2), 800);
    });
});

// ?˜ì´ì§€ ?¤í‚µ ë¡œì§
const skipButtons = document.querySelectorAll('.btn-skip');
skipButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
        const targetStage = parseInt(btn.getAttribute('data-target'));
        
        if (!currentDeptId || !currentRole) {
            const forceTest = confirm("?„ì¬ ? íƒ??ë¶€?œë‚˜ ì§ê¸‰???†ìŠµ?ˆë‹¤! ?ŒìŠ¤?¸ìš© '?ŒìŠ¤?¸ë???ë¶€?? ê¶Œí•œ?¼ë¡œ ê°•ì œ ?…ì¥?˜ì‹œê² ìŠµ?ˆê¹Œ?");
            if (forceTest) {
                currentDeptId = 'test-dept-' + Date.now(); // ?„ì‹œ ë¶€???ì„±
                currentDeptName = '?ŒìŠ¤?¸ë???;
                currentRole = 'ë¶€??;
                saveSessionState();
            } else {
                return;
            }
        }
        
        if (confirm(`${targetStage}?¨ê³„ë¡?ê°•ì œ ?´ë™?˜ì‹œê² ìŠµ?ˆê¹Œ?`)) {
            try {
                // ë¶€??ë¬¸ì„œê°€ ?†ìœ¼ë©??„ì‹œ ?ì„±
                await setDoc(doc(db, 'departments', currentDeptId), {
                    name: currentDeptName,
                    currentStage: targetStage,
                    startTime: Date.now()
                }, { merge: true });
                
                // ëª¨ë‹¬ ?«ê¸°
                adminModal.classList.add('hidden');
                
                // ëª¨ë“  ?”ë©´ ?¨ê¸°ê¸?
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
                    alert(`${targetStage}?¨ê³„ ?”ë©´?€ ?„ì§ ê³µì‚¬ ì¤‘ì…?ˆë‹¤! ?ë”±?ë”± ?› ï¸?);
                }
                
            } catch(e) {
                console.error(e);
            }
        }
    });
});

// ==========================================
// Screen 1: ?¤í”„??ë¡œì§
// ==========================================
let introParagraphs = [];
let currentIntroIndex = 0;

function startScreen1() {
    mainHeader.classList.remove('hidden');
    currentTeamDisplay.textContent = `${currentDeptName} - ${currentRole}`;

    // ?¤í”„???¤í† ë¦?ëª¨ë‹¬ ì¤€ë¹?
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
            
            // ì»¨í…Œ?´ë„ˆ ?¤í¬ë¡?ë§??„ë˜ë¡?
            container.parentElement.scrollTop = container.parentElement.scrollHeight;
            
            if (currentIntroIndex === introParagraphs.length - 1) {
                btnNext.classList.add('hidden');
                btnClose.classList.remove('hidden');
            }
        }
    };

    introModal.classList.remove('hidden');
    
    // ?ìƒ ?ë™ ?¬ìƒ ?œë„
    if (introVideo) {
        introVideo.play().catch(e => console.log("?ë™ ?¬ìƒ ë°©ì???, e));
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
    // ì´ˆê¸°?ëŠ” ë¬´ì‘?„ë¡œ ?ì–´??ë°°ì¹˜
    const shuffledCards = [...PUZZLE_DATA.opening.cards].sort(() => Math.random() - 0.5);
    
    shuffledCards.forEach(cardData => {
        const card = document.createElement('div');
        card.className = 'flip-card';
        card.setAttribute('draggable', 'true');
        card.dataset.id = cardData.id;
        card.dataset.back = cardData.back;

        // ?´ì§ˆ?¬ì§„ ?ë‚Œ???„í•´ ?½ê°„???œë¤ ?Œì „ê³??¤í”„??ë¶€??
        const randomRot = (Math.random() - 0.5) * 10; // -15??~ +15??
        const randomY = (Math.random() - 0.5) * 10;   // -10px ~ +10px
        card.style.transform = `rotate(${randomRot}deg) translateY(${randomY}px)`;
        
        card.innerHTML = `
            <div class="flip-card-inner">
                <div class="flip-card-front" style="background-image: url('splash_bg.png'); background-size: cover; background-position: center; border: 2px solid var(--accent-gold);">
                    <!-- ?ë©´?€ ?¨ê²¨ì§??íƒœ -->
                    <span style="background: rgba(0,0,0,0.7); padding: 5px; border-radius: 4px; font-weight: bold; color: white;">ì¡°ì‚¬ ì¹´ë“œ</span>
                </div>
                <div class="flip-card-back" style="display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 1rem;">
                    <span style="font-size: 0.85rem; font-family: 'Noto Sans KR'; font-weight: 500; word-break: keep-all; line-height: 1.5; color: var(--text-main);">${cardData.text}</span>
                    <!-- ?«ì???”ë©´??ë³´ì—¬ì£¼ì? ?Šê³  ?¤ì§ ?•ë ¬ ?œì„œ ì²´í¬?©ìœ¼ë¡œë§Œ ?¬ìš©?©ë‹ˆ??-->
                </div>
            </div>
        `;

        // ?¤ì§‘ê¸??´ë²¤??
        card.addEventListener('click', () => {
            card.classList.toggle('flipped');
            checkUnlockCondition();
        });

        // ?œë˜ê·????œë¡­ ?´ë²¤??
        card.addEventListener('dragstart', (e) => {
            card.classList.add('dragging');
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            checkUnlockCondition();
        });

        openingCardsContainer.appendChild(card);
    });

    // ì»¨í…Œ?´ë„ˆ ?œë˜ê·??•ë ¬ ë¡œì§
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

    // ëª¨ë°”???°ì¹˜(?œë˜ê·? ì§€??
    let touchDragging = null;
    openingCardsContainer.addEventListener('touchstart', e => {
        if (e.target.closest('.flip-card')) {
            touchDragging = e.target.closest('.flip-card');
            // ?°ì¹˜ ?œì‘ ??ë°”ë¡œ ?¤ì§‘?ˆì? ?Šë„ë¡??½ê°„???œë ˆ??
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

// ?œë˜ê·??„ì¹˜ ê³„ì‚° ?¨ìˆ˜
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

// ? ê¸ˆ ?´ì œ ì¡°ê±´ ê²€??(?¼ë“œë°±ìš© ?œê°???¨ê³¼ë§?
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

// ? ê¸ˆ ?´ì œ ë²„íŠ¼ ?´ë¦­
btnUnlock.addEventListener('click', () => {
    const cards = [...openingCardsContainer.querySelectorAll('.flip-card')];
    const isAllFlipped = cards.every(c => c.classList.contains('flipped'));
    const currentOrder = cards.map(c => c.dataset.back).join('');

    if (!isAllFlipped) {
        alert("ëª¨ë“  ì¡°ì‚¬ ì¹´ë“œë¥??¤ì§‘???´ìš©???•ì¸?´ì£¼?¸ìš”!");
        return;
    }
    
    if (currentOrder !== '1234') {
        alert("?œì„œê°€ ?€?¸ìŠµ?ˆë‹¤. ?˜ë¥˜ ?ì‚°ë¶€???ê¸°ê¹Œì? ?˜ê²½ ?¤ì—¼??ë°œìƒ?˜ëŠ” ?¬ë°”ë¥??œì„œ?€ë¡??˜ì—´?´ë³´?¸ìš”!");
        return;
    }

    diaryText.textContent = PUZZLE_DATA.opening.diaryText;
    diaryModal.classList.remove('hidden');
});

// ?¤ì´?´ë¦¬ ???œì¶œ
btnSubmitOpening.addEventListener('click', async () => {
    const selected = document.querySelector('input[name="flow-type"]:checked');
    if (!selected) {
        alert('?µì„ ? íƒ?´ì£¼?¸ìš”.');
        return;
    }

    if (selected.value === PUZZLE_DATA.opening.answer) {
        // ?•ë‹µ ??
        openingErrorMsg.classList.add('hidden');
        diaryModal.classList.add('hidden');
        alert('?•ë‹µ?…ë‹ˆ?? 1?¨ê³„ë¡??´ë™?©ë‹ˆ??');
        
        // ?íƒœ ?…ë°?´íŠ¸
        try {
            await updateDoc(doc(db, 'departments', currentDeptId), {
                currentStage: 1
            });
        } catch(e) { console.error(e); }

        // 1?¨ê³„ ?”ë©´?¼ë¡œ ?„í™˜
        document.getElementById('screen-1').classList.add('hidden');
        document.getElementById('screen-2').classList.remove('hidden');
        startScreen2();
    } else {
        openingErrorMsg.classList.remove('hidden');
    }
});

// ==========================================
// Screen 2: 1?¨ê³„ (?”ì?¸ìš”?Œì‹¤) ë¡œì§
// ==========================================
function startScreen2(deptData) {
    mainHeader.classList.remove('hidden');
    currentTeamDisplay.textContent = `${currentDeptName} - ${currentRole}`;
    
    document.getElementById('display-current-role').textContent = currentRole;
    
    // 1?¨ê³„ ?¤í† ë¦?ëª¨ë‹¬ ?„ìš°ê¸?
    if (!(deptData && deptData.showStage1Reasoning)) {
        document.getElementById('stage1-story-modal').classList.remove('hidden');
    }
    
    document.getElementById('btn-start-stage1-missions').onclick = () => {
        document.getElementById('stage1-story-modal').classList.add('hidden');
    };
    
    // ë¯¸ì…˜ 1-1 (ëª½í?ì£? ?¸íŒ…
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
                alert('?•ë‹µ?…ë‹ˆ?? ?¤ìŒ ë¯¸ì…˜???´ë ¸?µë‹ˆ??');
                optionsContainer.querySelectorAll('button').forEach(b => b.disabled = true);
                const m2 = document.getElementById('mission-1-2');
                if (m2) {
                    m2.classList.remove('hidden');
                    m2.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            } else {
                alert('?€?¸ìŠµ?ˆë‹¤. ?¨ì„œë¥??¤ì‹œ ?•ì¸?´ë³´?¸ìš”.');
                btn.classList.remove('selected');
            }
        });
        optionsContainer.appendChild(btn);
    });

    // ë¯¸ì…˜ 1-2 (?ë‹¨ êµì§‘?? ?¸íŒ…
    const fabricData = PUZZLE_DATA.stage1.fabricStandards[currentRole];
    document.getElementById('fabric-clue-title').textContent = fabricData.title;
    document.getElementById('fabric-clue-text').textContent = fabricData.text;
    
    const btnSubmitM2 = document.getElementById('btn-submit-mission-1-2');
    if (btnSubmitM2) {
        btnSubmitM2.textContent = currentRole === 'ë¶€?? ? 'ìµœì¢… ?¹ì¸?˜ê¸°' : 'ë¶€?¥ë‹˜ê»?ê²°ì¬ ?¬ë¦¬ê¸?;
    }
    
    document.querySelectorAll('.fabric-btn').forEach(btn => {
        // ë³µìˆ˜ ? íƒ ê°€?¥í•˜?„ë¡ ? ê?
        btn.onclick = () => btn.classList.toggle('selected');
    });

    document.getElementById('btn-submit-mission-1-2').onclick = () => {
        const selectedButtons = Array.from(document.querySelectorAll('.fabric-btn.selected'));
        if (selectedButtons.length === 0) {
            alert('?ë‹¨???˜ë‚˜ ?´ìƒ ? íƒ?´ì£¼?¸ìš”.');
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
            alert(currentRole === 'ë¶€?? ? '?•ë‹µ?…ë‹ˆ?? ?„ë²½???ë‹¨??ê³¨ë¼ ìµœì¢… ?¹ì¸?˜ì…¨?µë‹ˆ??' : '?•ë‹µ?…ë‹ˆ?? ë¶€?¥ë‹˜ê»?ê¸°ì•ˆ??ë¬´ì‚¬???ì‹ ?ˆìŠµ?ˆë‹¤!');
            document.getElementById('btn-submit-mission-1-2').disabled = true;
            document.getElementById('btn-submit-mission-1-2').textContent = currentRole === 'ë¶€?? ? 'ìµœì¢… ?¹ì¸ ?„ë£Œ' : 'ê²°ì¬ ?”ì²­ ?„ë£Œ (ê¸°ì•ˆ ?ì‹ )';
            document.querySelectorAll('.fabric-btn').forEach(b => b.disabled = true);
            
            const m3 = document.getElementById('mission-1-3');
            if (m3) {
                m3.classList.remove('hidden');
                m3.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else {
            alert('?€?¸ìŠµ?ˆë‹¤. ?±ë¶„?œì? ì¡°ê±´???¤ì‹œ ?œë²ˆ ê¼¼ê¼¼???•ì¸?˜ì„¸??');
        }
    };

    // ë¯¸ì…˜ 1-3 (?¤ì²œ??ì¶”ë¡ ) ?¸íŒ…
    const reasoningData = PUZZLE_DATA.stage1.reasoning;
    document.getElementById('reasoning-context').innerHTML = reasoningData.context.replace(/\n/g, '<br>');
    document.getElementById('reasoning-role-label').textContent = reasoningData.roleLabels[currentRole];

    if (currentRole === 'ë¶€??) {
        document.getElementById('manager-montage-panel').classList.remove('hidden');
        document.getElementById('manager-submit-panel').classList.remove('hidden');
        document.getElementById('btn-stage1-confirm-all').style.display = 'none'; // ë¶€?¥ì? ?„ì²´ ?œì¶œ ì°??´ìš©
        document.getElementById('reasoning-textarea').style.display = 'none'; // ë¶€?¥ì? ëª¨ë‹¬?ì„œ ?…ë ¥
        document.getElementById('reasoning-role-label').textContent = "ë¶€?¥ë‹˜?€ ?€?ë“¤??ëª¨ë‘ ?¨ì„œ?€ ?˜ê²¬???œì¶œ???Œê¹Œì§€ ê¸°ë‹¤??ì£¼ì„¸?? ?˜ë‹¨??'ìµœì¢… ?•ë‹µ ?œì¶œ'???„ë£Œ?˜ë©´ ? ë¡  ì°½ì´ ?´ë¦½?ˆë‹¤.";
        document.getElementById('reasoning-role-label').style.color = '#ff9f43';
        
        // ë¶€???„ìš© ?¤ì‹œê°??€???„í™© ëª¨ë‹ˆ?°ë§
        onSnapshot(collection(db, `departments/${currentDeptId}/roles`), (snapshot) => {
            let allConfirmed = true;
            const requiredRoles = ['?¸í„´', '?¬ì›', 'ì°¨ì¥'];
            
            requiredRoles.forEach(role => {
                const statusEl = document.getElementById(`status-${role}`);
                if (!statusEl) return;
                
                const roleDoc = snapshot.docs.find(d => d.id === role);
                const isConfirmed = roleDoc && roleDoc.data().stage1Confirmed;
                const reasoningText = roleDoc ? roleDoc.data().reasoning : "";
                
                const reasoningDisplay = statusEl.querySelector('.reasoning-display');
                if (isConfirmed) {
                    statusEl.classList.add('done');
                    statusEl.querySelector('.status-icon').textContent = '??;
                    if (reasoningDisplay && reasoningText) {
                        reasoningDisplay.textContent = `"${reasoningText}"`;
                        reasoningDisplay.style.display = 'block';
                    }
                } else {
                    statusEl.classList.remove('done');
                    statusEl.querySelector('.status-icon').textContent = '??;
                    if (reasoningDisplay) reasoningDisplay.style.display = 'none';
                    allConfirmed = false;
                }
            });
            
            // ?ŒìŠ¤???¸ì˜ë¥??„í•´ ?€?ì´ ëª¨ë‘ ?œì¶œ?˜ì? ?Šì•„??ë¶€??ë²„íŠ¼ ??ƒ ?œì„±??
            document.getElementById('btn-submit-stage1').disabled = false;
        });
        
        // ë¶€???„ìš© ìµœì¢… ?œì¶œ ë²„íŠ¼
        const btnSubmitStage1 = document.getElementById('btn-submit-stage1');
        btnSubmitStage1.onclick = async () => {
            const finalAnswer1 = document.getElementById('manager-final-answer-1').value;
            const finalAnswer2 = document.getElementById('manager-final-answer-2').value;
            const errorMsg = document.getElementById('manager-error-msg');
            
            if (!finalAnswer1 || !finalAnswer2) {
                alert('ë¯¸ì…˜ 1(ëª½í?ì£?ê³?ë¯¸ì…˜ 2(ì¹œí™˜ê²???ìµœì¢… ?•ë‹µ??ëª¨ë‘ ? íƒ?´ì£¼?¸ìš”.');
                return;
            }
            
            if (finalAnswer1 === 'B' && finalAnswer2 === 'H') {
                errorMsg.classList.add('hidden');
                btnSubmitStage1.disabled = true;
                btnSubmitStage1.textContent = 'ìµœì¢… ?¹ì¸ ?„ë£Œ (?¤ì²œ??ì¶”ë¡  ì§„í–‰ì¤?';
                
                try {
                    await updateDoc(doc(db, 'departments', currentDeptId), {
                        showStage1Reasoning: true
                    });
                    alert('?‰ ëª¨ë“  ?€?ì˜ ?˜ê²¬??ì¢…í•©?˜ì—¬ ì§„ì§œ ?„ì•ˆê³??ë‹¨??ì°¾ì•˜?µë‹ˆ??\n\n?´ì œ ?ì—…?˜ëŠ” \'?¤ì²œ??ì¶”ë¡ \' ë¬¸ì œë¥?ë¶€?œì›?¤ê³¼ ? ë¡ ?˜ì—¬ ?´ê²°?˜ì„¸??');
                    showReasoningModal(PUZZLE_DATA.stage1, 2);
                } catch(e) {
                    console.error(e);
                }
                
            } else {
                errorMsg.classList.remove('hidden');
                errorMsg.textContent = '?¤ë‹µ?…ë‹ˆ?? ?€?ë“¤??ëª¨ì•„???¨ì„œ(êµì§‘??ë¥??¤ì‹œ ?œë²ˆ ë¶„ì„?´ë³´?¸ìš”.';
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
                    alert('?˜ê²¬??ì¡°ê¸ˆ ???ì„¸???ì–´??ê¸°ì•ˆ?´ì£¼?¸ìš”.');
                    return;
                }
                
                try {
                    const roleRef = doc(db, `departments/${currentDeptId}/roles`, currentRole);
                    await updateDoc(roleRef, { stage1Confirmed: true, reasoning: textarea.value });
                    
                    alert('ë¶€?¥ë‹˜ê»?ìµœì¢… ê¸°ì•ˆ(ê²°ì¬ ?”ì²­)??ë¬´ì‚¬???˜ê²¼?µë‹ˆ?? ë¶€?¥ë‹˜??ëª¨ë‘???˜ê²¬??ì·¨í•©??ìµœì¢… ?¹ì¸???Œê¹Œì§€ ?€ê¸°í•´ì£¼ì„¸??');
                    btnConfirmAll.disabled = true;
                    btnConfirmAll.textContent = 'ê¸°ì•ˆ ?ì‹  ?„ë£Œ (ë¶€???¹ì¸ ?€ê¸?ì¤?..)';
                    textarea.disabled = true;
                } catch(e) {
                    console.error(e);
                    alert('ê¸°ì•ˆ ?ì‹  ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.');
                }
            };
        }
        
        
    }
}

// ==========================================
// Screen 3: 2?¨ê³„ (?¨í„´/ë´‰ì œ?? ë¡œì§
// ==========================================
function startScreen3() {
    mainHeader.classList.remove('hidden');
    currentTeamDisplay.textContent = `${currentDeptName} - ${currentRole}`;
    
    document.getElementById('display-current-role-stage2').textContent = currentRole;
    
    // 2?¨ê³„ ?¤í† ë¦?ëª¨ë‹¬ ?„ìš°ê¸?
    const storyModal = document.getElementById('stage2-story-modal');
    storyModal.classList.remove('hidden');
    
    document.getElementById('stage2-intro-text').innerText = PUZZLE_DATA.stage2.intro;
    
    document.getElementById('btn-start-stage2-missions').onclick = () => {
        storyModal.classList.add('hidden');
    };
    
    const puzzleData = PUZZLE_DATA.stage2.puzzles[currentRole];
    
    if (currentRole === 'ë¶€??) {
        document.getElementById('stage2-employee-panel').classList.add('hidden');
        document.getElementById('stage2-manager-panel').classList.remove('hidden');
        
        // ë¶€???„í™©??ë¦¬ìŠ¤??
        onSnapshot(collection(db, `departments/${currentDeptId}/roles`), (snapshot) => {
            const roles = ['?¸í„´', '?¬ì›', 'ì°¨ì¥'];
            let allConfirmed = true;
            
            roles.forEach(role => {
                const statusEl = document.getElementById(`status-stage2-${role}`);
                if (!statusEl) return;
                
                const roleDoc = snapshot.docs.find(d => d.id === role);
                const isConfirmed = roleDoc && roleDoc.data().stage2Confirmed;
                
                if (isConfirmed) {
                    statusEl.classList.add('done');
                    statusEl.querySelector('.status-icon').textContent = '??;
                    statusEl.style.background = 'rgba(0,100,0,0.5)';
                } else {
                    statusEl.classList.remove('done');
                    statusEl.querySelector('.status-icon').textContent = '??;
                    statusEl.style.background = 'rgba(0,0,0,0.5)';
                    allConfirmed = false;
                }
            });
            
            // ?ŒìŠ¤???¸ì˜ë¥??„í•´ ë¶€??ë²„íŠ¼ ??ƒ ?œì„±??
            document.getElementById('btn-submit-stage2').disabled = false;
        });
        
        // ë¶€??ê¸ˆê³  ê°€??ë²„íŠ¼
        document.getElementById('btn-submit-stage2').onclick = async () => {
            const pw = document.getElementById('manager-vault-pw').value;
            if (pw === PUZZLE_DATA.stage2.puzzles['ë¶€??].answer) {
                document.getElementById('manager-error-msg-stage2').classList.add('hidden');
                
                // Firestoreë¥?ë¨¼ì? ?…ë°?´íŠ¸?˜ì—¬ ?¤ë¥¸ ?€?ë“¤???”ë©´???˜ì–´ê°€ê²???
                try {
                    await updateDoc(doc(db, 'departments', currentDeptId), {
                        currentStage: 3
                    });
                    
                    alert("?‰ ê³µì¥ ê°€???„ë£Œ! 2?¨ê³„ ?ˆì¶œ ?±ê³µ!\n\n(3?¨ê³„ ?¤í??¼ë§?¤ë¡œ ?´ë™?©ë‹ˆ??)");
                } catch(e) {
                    console.error(e);
                }
            } else {
                document.getElementById('manager-error-msg-stage2').classList.remove('hidden');
            }
        };
        
    } else {
        // ?¬ì›/?¸í„´/ì°¨ì¥
        document.getElementById('stage2-employee-panel').classList.remove('hidden');
        document.getElementById('stage2-manager-panel').classList.add('hidden');
        
        document.getElementById('stage2-puzzle-title').textContent = puzzleData.title;
        document.getElementById('stage2-puzzle-text').textContent = puzzleData.text;
        document.getElementById('stage2-puzzle-hint').textContent = `?ŒíŠ¸: ${puzzleData.hint}`;
        
        const btnSubmit = document.getElementById('btn-stage2-submit');
        const input = document.getElementById('stage2-answer-input');
        
        btnSubmit.onclick = async () => {
            if (input.value === puzzleData.answer) {
                alert(`?•ë‹µ?…ë‹ˆ?? ?¹ì‹ ??ì°¾ì? ?«ì??[ ${puzzleData.answer} ] ?…ë‹ˆ??\në¶€?¥ë‹˜?ê²Œ ???«ìë¥??œì„œ?€ë¡??Œë ¤ì£¼ì„¸??`);
                btnSubmit.disabled = true;
                btnSubmit.textContent = "?´ë… ?„ë£Œ (?€ê¸?ì¤?";
                input.disabled = true;
                
                // Firebase ?…ë°?´íŠ¸
                try {
                    await setDoc(doc(db, `departments/${currentDeptId}/roles`, currentRole), {
                        stage2Confirmed: true,
                        stage2Answer: puzzleData.answer
                    }, { merge: true });
                } catch(e) {
                    console.error(e);
                }
                
            } else {
                alert("ë¹„ë?ë²ˆí˜¸ê°€ ?€?¸ìŠµ?ˆë‹¤. ?ŒíŠ¸ë¥??¤ì‹œ ?½ì–´ë³´ì„¸??");
            }
        };
    }
}

// ==========================================
// Screen 4: 3?¨ê³„ (?¤í??¼ë§?? ë¡œì§
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
    
    if (currentRole === 'ë¶€??) {
        document.getElementById('stage3-employee-panel').classList.add('hidden');
        document.getElementById('stage3-manager-panel').classList.remove('hidden');
        
        onSnapshot(collection(db, `departments/${currentDeptId}/roles`), (snapshot) => {
            const roles = ['?¸í„´', '?¬ì›', 'ì°¨ì¥'];
            roles.forEach(role => {
                const statusEl = document.getElementById(`status-stage3-${role}`);
                if (!statusEl) return;
                
                const roleDoc = snapshot.docs.find(d => d.id === role);
                const isConfirmed = roleDoc && roleDoc.data().stage3Confirmed;
                
                if (isConfirmed) {
                    statusEl.classList.add('done');
                    statusEl.querySelector('.status-icon').textContent = '??;
                    statusEl.style.background = 'rgba(0,100,0,0.5)';
                } else {
                    statusEl.classList.remove('done');
                    statusEl.querySelector('.status-icon').textContent = '??;
                    statusEl.style.background = 'rgba(0,0,0,0.5)';
                }
            });
        });
        
        document.getElementById('stage3-manager-title').textContent = "?¨ì„œ 1: ?¼ìŠ¤??ì»¬ëŸ¬ ì¢…í•©";
        document.getElementById('stage3-manager-text').innerHTML = personalColorData.text.replace(/\n/g, '<br>');
        
        document.getElementById('btn-stage3-manager-submit').onclick = () => {
            const val = document.getElementById('stage3-manager-answer-input').value.replace(/\s+/g, '');
            if (val === personalColorData.answer) {
                alert("?•ë‹µ?…ë‹ˆ?? ?´ì œ ?€?ë“¤??ëª¨ì? ?¨ì„œë¡?ìµœì¢… ?¤í??¼ë§???„ì„±?˜ì„¸??");
                document.getElementById('stage3-manager-step1').classList.add('hidden');
                document.getElementById('stage3-manager-step2').classList.remove('hidden');
            } else {
                alert("?¤ë‹µ?…ë‹ˆ?? ?¤ì‹œ ?ê°?´ë³´?¸ìš”.");
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
            if (selectedItems['line'] === 'ê°€ë¡œì„ ' && 
                selectedItems['color'] === '?œìƒ‰' && 
                selectedItems['material'] === 'ë»£ë»£?? &&
                selectedItems['pattern'] === '?‘ì?ë¬´ëŠ¬') {
                
                errorMsg.classList.add('hidden');
                alert("?‰ ?„ë²½?©ë‹ˆ?? ?˜ê²½ê³??”ì?¸ì„ ëª¨ë‘ ê³ ë ¤??ì¹œí™˜ê²??˜ë¥˜ ì»¬ë ‰?˜ì´ ?„ì„±?˜ì—ˆ?µë‹ˆ??\n?´ì œ ?ì—…?˜ëŠ” '?¤ì²œ??ì¶”ë¡ ' ë¬¸ì œë¥?ë¶€?œì›?¤ê³¼ ? ë¡ ?˜ì—¬ ?´ê²°?˜ì„¸??");
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
        
        document.getElementById('stage3-puzzle-title').textContent = "?¨ì„œ 1: ?¼ìŠ¤??ì»¬ëŸ¬";
        document.getElementById('stage3-puzzle-text').innerHTML = personalColorData.text.replace(/\n/g, '<br>');
        document.getElementById('stage3-puzzle-hint').textContent = '';
        
        const btnSubmit = document.getElementById('btn-stage3-submit');
        const input = document.getElementById('stage3-answer-input');
        
        let currentStep = 1;
        
        btnSubmit.onclick = async () => {
            if (currentStep === 1) {
                if (input.value.replace(/\s+/g, '') === personalColorData.answer) {
                    alert(`?•í™•???¨ì„œë¥?ì°¾ì•˜?µë‹ˆ??\n?¤ìŒ ?¨ì„œë¥??•ì¸?˜ì„¸??`);
                    currentStep = 2;
                    input.value = '';
                    document.getElementById('stage3-puzzle-title').textContent = "?¨ì„œ 2: ì°©ì‹œ?¨ê³¼ ? íƒ";
                    document.getElementById('stage3-puzzle-text').innerHTML = PUZZLE_DATA.stage3.bodyType.memo.replace(/\n/g, '<br>') + '<br><br>' + bodyTypeData.text;
                } else {
                    alert("?¤ë‹µ?…ë‹ˆ?? ì¿¨í†¤ê³??œí†¤ ì¤??˜ë‚˜ë¥??…ë ¥?˜ì„¸??");
                }
            } else if (currentStep === 2) {
                if (input.value.replace(/\s+/g, '') === bodyTypeData.answer) {
                    alert(`ëª¨ë“  ?¨ì„œë¥?ì°¾ì•˜?µë‹ˆ?? ë¶€?¥ë‹˜?ê²Œ ?Œë ¤ì£¼ì„¸??`);
                    btnSubmit.disabled = true;
                    btnSubmit.textContent = "?„ì†¡ ?„ë£Œ (?€ê¸?ì¤?";
                    input.disabled = true;
                    
                    try {
                        await setDoc(doc(db, `departments/${currentDeptId}/roles`, currentRole), {
                            stage3Confirmed: true
                        }, { merge: true });
                    } catch(e) {
                        console.error(e);
                    }
                } else {
                    alert("?¤ë‹µ?…ë‹ˆ?? ?¤ì‹œ ?ê°?´ë³´?¸ìš”!");
                }
            }
        };
        
        
    }
}

// 4?¨ê³„: ?°ì¹­???€ê¸°ì‹¤ (T.P.O ë°??˜ê²½?ìˆ˜)
function startScreen5() {
    document.getElementById('display-current-role-stage4').textContent = currentRole;
    
    // ëª¨ë‹¬ ?„ìš°ê¸?
    const storyModal = document.getElementById('stage4-story-modal');
    storyModal.classList.remove('hidden');
    document.getElementById('stage4-intro-text').innerHTML = PUZZLE_DATA.stage4.intro.replace(/\n/g, '<br>');
    
    document.getElementById('btn-start-stage4-missions').onclick = () => {
        storyModal.classList.add('hidden');
    };
    
    const puzzleData = PUZZLE_DATA.stage4.puzzles[currentRole];
    
    if (currentRole === 'ë¶€??) {
        document.getElementById('stage4-employee-panel').classList.add('hidden');
        document.getElementById('stage4-manager-panel').classList.remove('hidden');
        document.getElementById('reasoning-textarea').classList.add('hidden');
        
        // ë¶€??Step 1: TPO ?ê?
        document.getElementById('stage4-manager-step1-title').textContent = puzzleData.step1.title;
        document.getElementById('stage4-manager-step1-text').textContent = puzzleData.step1.text;
        
        document.getElementById('btn-stage4-manager-step1').onclick = () => {
            const val = document.getElementById('stage4-manager-step1-input').value.replace(/\s+/g, '');
            if (val === puzzleData.step1.answer) {
                alert('?•ë‹µ?…ë‹ˆ?? ?´ì œ ?€?ë“¤???¬ë¦° ?¨ì„œë¥?ëª¨ì•„ 5R ?œì„œë¥?ë§ì¶”ê³?ìµœì¢… ?˜ê²½ ?ìˆ˜ë¥??…ë ¥?˜ì„¸??');
                document.getElementById('stage4-manager-step1').classList.add('hidden');
                document.getElementById('stage4-5r-puzzle').classList.remove('hidden');
            } else {
                alert('?¤ë‹µ?…ë‹ˆ?? ?¤ì‹œ ?ê°?´ë³´?¸ìš”.');
            }
        };

        // 5R ?œë˜ê·????œë¡­ ë¡œì§
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
        // --- ìº”ë²„???¤ì?ì¹˜ë¶ ë¡œì§ ---
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
                e.preventDefault(); // ?¤í¬ë¡?ë°©ì?
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
            
            // ?‰ìƒ ë²„íŠ¼ ?´ë²¤??
            document.querySelectorAll('.color-btn').forEach(btn => {
                btn.onclick = () => {
                    document.querySelectorAll('.color-btn').forEach(b => b.style.borderColor = 'transparent');
                    btn.style.borderColor = 'white';
                    ctx.strokeStyle = btn.getAttribute('data-color');
                };
            });
            
            // ?„êµ¬ ë²„íŠ¼ ê³µí†µ ì²˜ë¦¬ ?¨ìˆ˜
            const setToolActive = (activeId) => {
                document.querySelectorAll('.btn-tool').forEach(b => b.style.borderColor = 'transparent');
                document.getElementById(activeId).style.borderColor = 'white';
            };

            // ?„êµ¬ ë²„íŠ¼ ?´ë²¤??
            document.getElementById('btn-tool-pen').onclick = () => {
                currentTool = 'pen';
                setToolActive('btn-tool-pen');
                ctx.lineWidth = 5;
                ctx.globalAlpha = 1.0;
                // ?„ì¬ ? íƒ???‰ìƒ ? ì?
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
        
        // ìº”ë²„??AI ë¶„ì„ ë²„íŠ¼
        const btnAnalyzeCanvas = document.getElementById('btn-analyze-canvas');
        if (btnAnalyzeCanvas) {
            btnAnalyzeCanvas.onclick = () => {
                aiFeedback.classList.remove('hidden');
                aiFeedbackText.textContent = "ìº”ë²„???´ë?ì§€ë¥?ë¶„ì„ ì¤‘ì…?ˆë‹¤...";
                setTimeout(() => {
                    aiFeedbackText.innerHTML = "<b>[Claude Vision API ë¶„ì„ ê²°ê³¼]</b><br>?˜ë¥˜??ì§ˆê°?????œí˜„?˜ì—ˆ?¼ë©°, ? ì˜ ?ë¦„??ëª¨ë¸??ì²´í˜•??ë³´ì™„?????ˆë„ë¡??¤ì?ì¹˜ë˜?ˆìŠµ?ˆë‹¤. 5R ì¤?'?¬ì‚¬?? ?”ì†Œë¥??ìš©?˜ê¸° ì¢‹ì? ?”ì???•íƒœ?…ë‹ˆ??";
                }, 2500);
            };
        }
        
        // ?Œì¼ ?…ë¡œ????AI ë¶„ì„ ?¸ì¶œ ?„ì‹œ ë¡œì§
        const fileUpload = document.getElementById('design-upload');
        const aiFeedback = document.getElementById('ai-feedback-panel');
        const aiFeedbackText = document.getElementById('ai-feedback-text');
        
        if (fileUpload) {
            fileUpload.addEventListener('change', () => {
                if(fileUpload.files && fileUpload.files[0]) {
                    aiFeedback.classList.remove('hidden');
                    aiFeedbackText.textContent = "?´ë?ì§€ë¥?ë¶„ì„ ì¤‘ì…?ˆë‹¤...";
                    // ?„ì‹œ ë¶„ì„ ì§€???œê°„
                    setTimeout(() => {
                        aiFeedbackText.innerHTML = "<b>[Claude Vision API ë¶„ì„ ê²°ê³¼]</b><br>?˜ë¥˜??ì§ˆê°?????œí˜„?˜ì—ˆ?¼ë©°, ? ì˜ ?ë¦„??ëª¨ë¸??ì²´í˜•??ë³´ì™„?????ˆë„ë¡??¤ì?ì¹˜ë˜?ˆìŠµ?ˆë‹¤. 5R ì¤?'?¬ì‚¬?? ?”ì†Œë¥??ìš©?˜ê¸° ì¢‹ì? ?”ì???•íƒœ?…ë‹ˆ??";
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
            
            // ?¼ì ?ŒìŠ¤?¸í•˜ê¸??½ë„ë¡?isTeamDone ì¡°ê±´ ?„ì‹œ ?´ì œ
            if (is5RCorrect && isScoreCorrect) {
                btnLaunch.disabled = false;
                btnLaunch.style.background = 'linear-gradient(45deg, #FFD700, #FFA500)';
                btnLaunch.style.color = '#000';
                btnLaunch.style.cursor = 'pointer';
                btnLaunch.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
                btnLaunch.textContent = "?ŒŸ ?°ì¹­??ê°€???ŒŸ";
            } else {
                btnLaunch.disabled = true;
                btnLaunch.style.background = '#555';
                btnLaunch.style.color = '#888';
                btnLaunch.style.cursor = 'not-allowed';
                btnLaunch.style.boxShadow = 'none';
                btnLaunch.textContent = "ì¡°ê±´ ?¬ì„± ???°ì¹­??ê°€??";
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
        
        // ?€?ë“¤???•ë‹µ ?„í™© ?¤ì‹œê°?ê°ì‹œ
        onSnapshot(collection(db, `departments/${currentDeptId}/roles`), (snapshot) => {
            let correctCount = 0;
            
            snapshot.forEach(docSnap => {
                const r = docSnap.id;
                const d = docSnap.data();
                
                if (['?¸í„´', '?¬ì›', 'ì°¨ì¥'].includes(r)) {
                    const statusEl = document.getElementById(`status-stage4-${r}`);
                    if (statusEl) {
                        if (d.stage4Confirmed) {
                            statusEl.querySelector('.status-icon').textContent = '??;
                            correctCount++;
                        } else {
                            statusEl.querySelector('.status-icon').textContent = '??;
                        }
                    }
                }
            });
            
            teamCorrectCount = correctCount;
            // ê²Œì´ì§€ ë°??…ë°?´íŠ¸ (?€???¬ì„±??ê¸°ë°˜)
            const simulatedScore = Math.floor((correctCount / 3) * 100);
            scoreFill.style.width = `${simulatedScore}%`;
            scoreText.textContent = `${simulatedScore} / 100 ??;
            
            checkManagerStage4Complete();
        });
        
        // ?°ì¹­ ë²„íŠ¼ ?´ë¦­ (3?¨ê³„ ?„ë£Œ) - ?´ì œ DBë¥??…ë°?´íŠ¸?˜ì—¬ ëª¨ë‘?ê²Œ ?°ì¹­???Œë¦¼
        btnLaunch.onclick = async () => {
            try {
                await updateDoc(doc(db, 'departments', currentDeptId), {
                    currentStage: 5
                });
            } catch(e) {
                console.error("?°ì¹­??ê°€???¤íŒ¨:", e);
                alert("?œë²„ ?¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤. ?¤ì‹œ ?œë„?´ì£¼?¸ìš”.");
            }
        };
        
        const btnSubmitPersonal = document.getElementById('btn-submit-personal-design');
        if (btnSubmitPersonal) {
            btnSubmitPersonal.onclick = () => {
                const reason = document.getElementById('personal-reason').value;
                const r5 = document.getElementById('personal-5r').value;
                if (!reason || !r5) {
                    alert('?„ìˆ˜ ? íƒ ?”ì†Œ(5R)?€ ?´ìœ ë¥??ì–´ì£¼ì„¸??');
                    return;
                }
                alert('ê°œì¸ ?”ì???œì¶œ???„ë£Œ?˜ì—ˆ?µë‹ˆ?? ?œë™ ?Œê° ?˜ì´ì§€ë¡??˜ì–´ê°‘ë‹ˆ??');
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
                    alert('ëª¨ë“  ì§ˆë¬¸???µí•´ì£¼ì„¸??');
                    return;
                }
                alert('?Œì¤‘???Œê° ê°ì‚¬?©ë‹ˆ?? ëª¨ë“  ?œë™??ì¢…ë£Œ?˜ì—ˆ?µë‹ˆ??');
                document.getElementById('screen-7').classList.add('hidden');
                
                // ?í•„ë¡œê·¸ ëª¨ë‹¬ ?œì‹œ
                const epilogueModal = document.getElementById('epilogue-modal');
                if (epilogueModal) epilogueModal.classList.remove('hidden');
                
                // ?í•„ë¡œê·¸ ?«ê³  ?„ëª…???”ë©´?¼ë¡œ
                const btnCloseEpilogue = document.getElementById('btn-close-epilogue');
                if (btnCloseEpilogue) {
                    btnCloseEpilogue.onclick = () => {
                        epilogueModal.classList.add('hidden');
                        const endingScreen = document.getElementById('screen-ending');
                        if (endingScreen) endingScreen.classList.remove('hidden');
                        
                        // ë¶€?œëª… ?¤ì •
                        let deptName = '?°ë¦¬ ë¶€??;
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
        // ?¸í„´, ?¬ì›, ì°¨ì¥
        document.getElementById('stage4-employee-panel').classList.remove('hidden');
        document.getElementById('stage4-manager-panel').classList.add('hidden');
        
        const optionsContainer = document.getElementById('stage4-options-container');
        optionsContainer.innerHTML = `
            <h3 id="stage4-puzzle-title" style="color: var(--accent-gold); margin-bottom: 1rem;"></h3>
            <p id="stage4-puzzle-text" style="font-size: 1.1rem; text-align: left; margin-bottom: 1rem; line-height: 1.6;"></p>
            <input type="text" id="stage4-employee-input" placeholder="?•ë‹µ ?…ë ¥" style="width:100%; padding: 0.8rem; text-align: center; font-size: 1.2rem; border-radius: 8px; border: 1px solid var(--accent-gold); background: rgba(0,0,0,0.6); color: white;">
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
                    alert('?•ë‹µ?…ë‹ˆ?? ?¤ìŒ ë¯¸ì…˜?¼ë¡œ ?˜ì–´ê°‘ë‹ˆ??');
                    currentStep = stepsSequence[stepIdx];
                    titleEl.textContent = puzzleData[currentStep].title;
                    textEl.textContent = puzzleData[currentStep].text;
                    input.value = '';
                } else {
                    alert(`ëª¨ë“  ê¸°íš??ê²€? ê? ?„ë£Œ?˜ì—ˆ?µë‹ˆ?? ë¶€?¥ë‹˜ ?„í™©?ì— ë°˜ì˜?˜ì—ˆ?µë‹ˆ??`);
                    btnSubmit.disabled = true;
                    btnSubmit.textContent = "ê¸°íš???•ì • ?„ë£Œ";
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
                feedback.textContent = "?˜ëª»???•ë‹µ?…ë‹ˆ?? ?¤ì‹œ ?ê°?´ë³´?¸ìš”.";
                feedback.classList.remove('hidden');
            }
        };
    }
    
    // ë¶€??ë°??€??ëª¨ë‘?ê²Œ ?ìš©?˜ëŠ” ?„ì—­ ë¦¬ìŠ¤??(Stage 5 / QR ?¤ìº” ?¨ê³„ ì§„ì…)
    onSnapshot(doc(db, 'departments', currentDeptId), (docSnap) => {
        const d = docSnap.data();
        if (d && d.currentStage === 5) {
            const successModal = document.getElementById('stage3-success-modal');
            const pwDisplay = document.getElementById('stage3-revealed-password');
            const guideText = document.getElementById('stage3-guide-text');
            const closeBtn = document.getElementById('btn-close-stage3-success');
            const waitingMsg = document.getElementById('stage3-waiting-msg');

            if (successModal && successModal.classList.contains('hidden')) {
                // pwDisplay ê´€??ë¡œì§?€ ?œê±°??
                if (guideText) {
                    guideText.innerHTML = "?´ì œ ?€?ë“¤ê³??¨ê»˜ êµì‹¤ ?´ë”˜ê°€???¨ê²¨???ˆëŠ” <strong>ì¡°ê° ?ë‹¨</strong>??ì°¾ì•„ë³´ì„¸??<br>?ë‹¨??ì°¾ì? ?? <strong>??• ???ê??†ì´ ?€???„êµ¬???€?œë¡œ</strong> ?ë‹¨??ë¶™ì–´ ?ˆëŠ” QR ì½”ë“œë¥??´ë???ì¹´ë©”?¼ë¡œ ?¤ìº”?˜ì„¸??";
                }
                
                closeBtn.classList.remove('hidden'); // ?„êµ¬???¤ìº” ì°½ì„ ?????ˆìŒ
                if(waitingMsg) waitingMsg.classList.add('hidden');
                
                successModal.classList.remove('hidden');

                // ?„êµ°ê°€ QR??ì°ì–´ ì¡°ê°???ë“?˜ë©´ ëª¨ë‘ê°€ 6?¨ê³„ë¡??˜ì–´ê°?
                const unsub = onSnapshot(doc(db, 'pieces', currentDeptId), (pieceSnap) => {
                    if (pieceSnap.exists() && pieceSnap.data().unlocked) {
                        unsub();
                        document.getElementById('stage3-success-modal').classList.add('hidden');
                        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
                        document.getElementById('screen-6').classList.remove('hidden');
                        document.getElementById('display-current-role-stage6').textContent = currentRole;
                        alert('?‰ ?€?ì´ ì¡°ê°???±ê³µ?ìœ¼ë¡?ì°¾ì•˜?µë‹ˆ?? ?¤ìŒ ë¯¸ì…˜?¼ë¡œ ?˜ì–´ê°‘ë‹ˆ??');
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
            document.getElementById('qr-dept-name').textContent = currentDeptName || '?°ë¦¬ ë¶€??;
        };
    }
}

// ??£½ (Confetti) ? ë‹ˆë©”ì´???¨ìˆ˜
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

// ?¤ì²œ??ì¶”ë¡  ëª¨ë‹¬ ë¡œì§
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
            allKeywords = rData.answers.concat(['?˜ëª»??, '?¨ì–´', 'ì¶”ê?']);
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
        // ?¤ì›Œ???ë¬¼? ê? ?†ëŠ” ê²½ìš° (?¨ìˆœ ? ë¡ )
        keywordsContainer.parentElement.style.display = 'none';
        sentenceContainer.innerHTML = `
            <p style="color: var(--accent-gold); text-align: center; margin-bottom: 1rem;">?€?ë“¤ê³?ì¶©ë¶„??? ë¡ ??ì§„í–‰???? ë¶€?¥ë‹˜??<b>[?©ì˜ ?„ë£Œ]</b> ë²„íŠ¼???ŒëŸ¬ì£¼ì„¸??</p>
            <textarea id="reasoning-summary" rows="4" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid var(--accent-gold); color: white; border-radius: 5px; margin-bottom: 1rem; box-sizing: border-box; font-family: inherit;" placeholder="?€??ìµœì¢… ?©ì˜ ?´ìš©???´ê³³???ìœ ë¡?²Œ ?•ë¦¬?˜ì„¸??.."></textarea>
        `;
    }
    
    const btnSubmit = document.getElementById('btn-submit-reasoning');
    btnSubmit.classList.remove('hidden');
    btnSubmit.style.display = 'inline-block';
    btnSubmit.textContent = rData.keywordLock ? '?ë¬¼???€ê¸? : '?©ì˜ ?„ë£Œ';
    btnSubmit.onclick = async () => {
        // (´©±¸³ª ÇÕÀÇ ¿Ï·á °¡´É)



        
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
            // ?”ì•½ ?ìŠ¤?¸ê? ?ˆìœ¼ë©?DB???€??
            const summaryEl = document.getElementById('reasoning-summary');
            if (summaryEl && summaryEl.value.trim() !== '') {
                try {
                    await setDoc(doc(db, `departments/${currentDeptId}/reasoning`, `stage${targetStageNum-1}`), {
                        roleGroup: currentRole,
                        summary: summaryEl.value.trim()
                    }, { merge: true });
                } catch(e) { console.error("?”ì•½ ?€???¤íŒ¨:", e); }
            }

            alert('?‰ ?©ì˜ ë°??¤ì²œ??ì¶”ë¡ ???„ë£Œ?˜ì—ˆ?µë‹ˆ?? ?¤ìŒ ?¨ê³„ë¡??´ë™?©ë‹ˆ??');
            modal.classList.add('hidden');
            
            try {
                await updateDoc(doc(db, 'departments', currentDeptId), {
                    currentStage: targetStageNum,
                    showStage1Reasoning: false,
                    showStage3Reasoning: false
                });
            } catch(e) {
                console.error("DB ?…ë°?´íŠ¸ ?¤íŒ¨:", e);
                alert('?œë²„?€ ?°ê²°??ë¬¸ì œê°€ ?ˆìŠµ?ˆë‹¤. ? ì‹œ ???¤ì‹œ ?œë„?´ì£¼?¸ìš”.');
            }
        } else {
            alert('?€?¸ìŠµ?ˆë‹¤! ë¬¸ë§¥???¤ì‹œ ?Œì•…?˜ì—¬ ?¬ë°”ë¥??¤ì›Œ?œë? ì±„ì›Œë³´ì„¸??');
        }
    };
}

// ì´ˆê¸°???¨ìˆ˜
async function initApp() {
    renderDeptGrid();
    
    // QR ?¤ìº”?¼ë¡œ ì§„ì…?ˆëŠ”ì§€ ?•ì¸ (?qr=true)
    const urlParams = new URLSearchParams(window.location.search);
    const isQrScan = urlParams.get('qr') === 'true';

    // ?¸ì…˜???¨ì•„?ˆë‹¤ë©??´ë‹¹ ?¨ê³„ë¡?ë°”ë¡œ ë³µêµ¬
    if (currentDeptId && currentRole) {
        try {
            // ë¶€?œì˜ currentStage ë³€ê²½ì„ ?¤ì‹œê°„ìœ¼ë¡?ê°ì??˜ì—¬ ?”ë©´ ?ë™ ?„í™˜
            onSnapshot(doc(db, 'departments', currentDeptId), (snap) => {
                if (snap.exists()) {
                    const d = snap.data();
                    const stage = d.currentStage || 0;
                    deptSelection.classList.add('hidden');
                    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                    document.querySelectorAll('.modal').forEach(m => { if (m.id !== 'reasoning-modal') m.classList.add('hidden'); });
                    
                    // QR ?¤ìº” ì§„ì…??ê²½ìš° ë°”ë¡œ QR ?”ë©´?¼ë¡œ ?´ë™ (ë¶€?¥ë§Œ ?ˆìš©)
                    if (isQrScan) {
                        if (currentRole !== 'ë¶€??) {
                            alert('QR ?¤ìº”ê³??”í˜¸ ?…ë ¥?€ ë¶€?¥ë‹˜ë§??????ˆìŠµ?ˆë‹¤!\në¶€?¥ë‹˜???´ë??°ìœ¼ë¡??¤ìº”?´ì£¼?¸ìš”.');
                            // ?¤í”Œ?˜ì‹œ???€ê¸??”ë©´?¼ë¡œ ?Œë ¤ë³´ëƒ„ (?°ì„  0?¨ê³„ ?”ë©´ ?„ì?)
                            document.getElementById('screen-0').classList.remove('hidden');
                            return;
                        }
                        document.getElementById('screen-qr').classList.remove('hidden');
                        document.getElementById('qr-dept-name').textContent = currentDeptName || '?°ë¦¬ ë¶€??;
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
                    // ?Œì´?´ë² ?´ìŠ¤??ë¶€??ë¬¸ì„œê°€ ?†ìœ¼ë©?ì´ˆê¸°?”ëœ ê²½ìš°) ?¸ì…˜ ? ë¦¼
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

// ?„ì²´ ?”ë©´ ëª¨ì•„ë³´ê¸° (God Mode)
const devGodModeBtn = document.getElementById('dev-god-mode');
if (devGodModeBtn) {
    let godMode = false;
    devGodModeBtn.addEventListener('click', () => {
        godMode = !godMode;
        if (godMode) {
            devGodModeBtn.textContent = '???ë˜?€ë¡?ë³µêµ¬?˜ê¸° (?ˆë¡œê³ ì¹¨)';
            devGodModeBtn.style.background = '#ff0055';
            
            // ?¤ë” ?œì‹œ
            document.getElementById('main-header').classList.remove('hidden');
            
            // ëª¨ë“  ?¤í¬ë¦??œì‹œ (?¤í”Œ?˜ì‹œ, ë¶€??? íƒ ?œì™¸)
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
            
            // ëª¨ë“  ë¶€???€???¨ë„, ëª¨ë‹¬ ???¨ê? ?´ì œ
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
            
            // ?¤í† ë¦?ëª¨ë‹¬ì°½ë“¤???¸ë¼?¸ìœ¼ë¡??œì‹œ
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

// --- QR ì¡°ê° ì°¾ê¸° ?”ë©´ ë¡œì§ ---
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
        
        // ?…ë ¥ê°’ê³¼ ?•ë‹µ?ì„œ ?„ì–´?°ê¸°ë¥?ëª¨ë‘ ?œê±°?˜ì—¬ ë¹„êµ (ê´€?€?˜ê²Œ)
        if (inputPw.replace(/\s+/g, '') === correctPw.replace(/\s+/g, '')) {
            qrErrorMsg.classList.add('hidden');
            btnSubmitQr.classList.add('hidden');
            qrPasswordInput.disabled = true;
            qrSuccessPanel.classList.remove('hidden');
            
            // pieces ì»¬ë ‰???…ë°?´íŠ¸
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

// --- ?€?œë³´??ë¡œì§ ---
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
    
    // Firestore pieces ì»¬ë ‰???¤ì‹œê°?êµ¬ë…
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
        
        // ëª¨ë‘ ?´ì œ?˜ì—ˆ?????°ì¶œ
        if (unlockedCount >= totalDepts && totalDepts > 0) {
            setTimeout(() => {
                fabricPuzzleContainer.classList.add('scale-up-anim');
                const finalMsg = document.getElementById('dashboard-final-message');
                finalMsg.classList.remove('hidden');
                
                // ?„ì‹œë¡??˜ë“œì½”ë”©??ë©”ì‹œì§€ (ê²Œì´ì§€ ?°ë™ ??
                document.getElementById('dashboard-final-text').innerHTML = "ê³ ë§ˆ?Œìš”, ?¬ëŸ¬ë¶? ?¬ëŸ¬ë¶„ì´ ì§€ì¼œë‚¸ ë§Œí¼?€ ë¶„ëª…???¬ë¼ì¡Œì–´?? ?¤ìŒ?ëŠ” ì¡°ê¸ˆ ?? ì§€?ê??¥í•œ ? íƒ ìª½ìœ¼ë¡??€?¸ì´ ê¸°ìš¸ë©?ì¢‹ê² ?´ìš”.";
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
        // ?ë˜ ?ˆë˜ ?”ë©´?¼ë¡œ ?Œì•„ê°€ê¸?(?€?œë³´?œëŠ” ê´€ë¦¬ì??QR ?„ë£Œ ?”ë©´?ì„œë§??¤ì–´??
        // ?¬ê¸°???¤í”Œ?˜ì‹œ??QR ?”ë©´?¼ë¡œ ë³´ë‚´ë²„ë¦¼
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
        if (confirm('ëª¨ë“  ê¸°ê¸°???¸ì…˜??ì´ˆê¸°?”í•˜ê³?ì²˜ìŒ ?”ë©´?¼ë¡œ ?Œì•„ê°€?œê² ?µë‹ˆê¹?')) {
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



