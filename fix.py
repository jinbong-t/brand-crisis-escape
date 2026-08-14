import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace inner listeners
content = re.sub(r'onSnapshot\(doc\(db,\s*\'departments\',\s*currentDeptId\),\s*\(docSnap\)\s*=>\s*\{\s*const\s+d\s*=\s*docSnap\.data\(\);\s*if\s*\(d\s*&&\s*d\.showStage1Reasoning\)\s*\{\s*showReasoningModal\(PUZZLE_DATA\.stage1,\s*2\);\s*\}\s*\}\);\s*', '', content)
content = re.sub(r'onSnapshot\(doc\(db,\s*\'departments\',\s*currentDeptId\),\s*\(docSnap\)\s*=>\s*\{\s*const\s+d\s*=\s*docSnap\.data\(\);\s*if\s*\(d\s*&&\s*d\.showStage3Reasoning\)\s*\{\s*showReasoningModal\(PUZZLE_DATA\.stage3,\s*4\);\s*\}\s*\}\);\s*', '', content)

# Fix initApp
target_init = '''                    if (stage === 1) {
                        const s2 = document.getElementById('screen-2');
                        if (s2) {
                            s2.classList.remove('hidden');
                            startScreen2();
                        }
                    }'''
repl_init = '''                    if (stage === 1) {
                        const s2 = document.getElementById('screen-2');
                        if (s2) {
                            s2.classList.remove('hidden');
                            startScreen2();
                            if (d && d.showStage1Reasoning) {
                                showReasoningModal(PUZZLE_DATA.stage1, 2);
                            }
                        }
                    }'''
content = content.replace(target_init, repl_init)

target_init2 = '''                    } else if (stage === 3) {
                        const s4 = document.getElementById('screen-4');
                        if (s4) {
                            s4.classList.remove('hidden');
                            startScreen4();
                        }
                    }'''
repl_init2 = '''                    } else if (stage === 3) {
                        const s4 = document.getElementById('screen-4');
                        if (s4) {
                            s4.classList.remove('hidden');
                            startScreen4();
                            if (d && d.showStage3Reasoning) {
                                showReasoningModal(PUZZLE_DATA.stage3, 4);
                            }
                        }
                    }'''
content = content.replace(target_init2, repl_init2)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)
