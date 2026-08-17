$content = Get-Content index.html -Raw
$pattern = '(?s)                                <!-- 왼쪽: 아바타 미리보기 -->\r?\n                                <div id="avatar-dropzone".*?                                </div>'
$replacement = @"
                                <!-- 가운데: 아바타 모델 (드롭존) - 크기 100% 유지(상대적 축소) -->
                                <div id="avatar-dropzone" class="avatar-section" style="width: 220px; height: 400px; background-image: url('avatar_base.png'); background-size: cover; background-position: center; border-radius: 12px; border: 3px dashed #8b5a2b; position: relative; box-shadow: 0 8px 15px rgba(0,0,0,0.2); overflow: hidden;">
                                    <div style="position: absolute; bottom: -5px; width: 100%; text-align: center; z-index: 20;">
                                        <div style="background: rgba(255,255,255,0.9); padding: 0.3rem 0.8rem; display: inline-block; border-radius: 15px; border: 2px solid #8b5a2b; color: #5a3a1b; font-size: 0.8rem; font-weight: bold;">오지수 모델 핏</div>
                                    </div>
                                    <div class="dropzone-hint" style="position: absolute; top: 10px; width: 100%; text-align: center; color: rgba(139,90,43,0.7); font-size: 0.75rem; font-weight: bold; background: rgba(255,255,255,0.8); padding: 0.2rem; border-radius: 8px; z-index: 20;">이곳이나 우측 슬롯에 드롭!</div>
                                </div>
                                
                                <!-- 오른쪽: 장착된 아이템 표시 패널 (아바타 높이에 맞춤) -->
                                <div class="equipped-panel" style="width: 110px; height: 400px; display: flex; flex-direction: column; gap: 8px; background: rgba(255,255,255,0.5); padding: 8px; border-radius: 10px; border: 2px solid #c7a477;">
                                    <div style="text-align: center; font-size: 0.75rem; font-weight: bold; color: #5a3a1b;">장착 슬롯</div>
                                    <div class="avatar-slot" id="slot-line" data-accept="선" style="flex: 1;"></div>
                                    <div class="avatar-slot" id="slot-color" data-accept="색" style="flex: 1;"></div>
                                    <div class="avatar-slot" id="slot-material" data-accept="재질" style="flex: 1;"></div>
                                    <div class="avatar-slot" id="slot-pattern" data-accept="무늬" style="flex: 1;"></div>
                                </div>
"@
$content = $content -replace $pattern, $replacement
Set-Content index.html -Value $content -NoNewline
