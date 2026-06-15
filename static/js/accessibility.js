// JavaScript implementation of Accessibility Toolbar & Speech Synthesizer Screen Reader

(function() {
    // Default settings
    let settings = {
        screenReader: false,
        readerMode: 'hover', // 'hover' or 'click'
        readerSpeed: 1.0,
        highContrast: false,
        grayscale: false,
        dyslexiaFont: false,
        highlightLinks: false,
        readingGuide: false,
        fontSizeScale: 1.0 // 1.0, 1.15, 1.30
    };

    // Load from localStorage if present
    const savedSettings = localStorage.getItem('stockflow_acc_settings');
    if (savedSettings) {
        try {
            settings = { ...settings, ...JSON.parse(savedSettings) };
        } catch (e) {
            console.error("Erro ao carregar configurações de acessibilidade:", e);
        }
    }

    // Speech synthesis configuration
    let synth = window.speechSynthesis;
    let currentUtterance = null;
    let voice = null;

    // Load Portuguese voice
    function loadVoice() {
        if (!synth) return;
        const voices = synth.getVoices();
        // Try to find a pt-BR or pt voice
        voice = voices.find(v => v.lang.includes('pt-BR')) || voices.find(v => v.lang.includes('pt'));
    }

    // Chrome and other browsers load voices asynchronously
    if (synth && synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = loadVoice;
    }
    loadVoice();

    // Helper to speak text
    function speak(text) {
        if (!synth || !settings.screenReader) return;

        // Ensure voice is loaded
        if (!voice) loadVoice();
        
        // Cancel active speech
        synth.cancel();

        if (!text || text.trim() === '') return;

        // Clean text a bit
        text = text.trim();

        const utterance = new SpeechSynthesisUtterance(text);
        if (voice) {
            utterance.voice = voice;
        }
        utterance.lang = 'pt-BR';
        utterance.rate = settings.readerSpeed;

        currentUtterance = utterance;
        synth.speak(utterance);
    }

    function stopSpeaking() {
        if (synth) {
            synth.cancel();
        }
    }

    // Build accessibility speaker string depending on element type
    function getSpeechTextForElement(el) {
        if (el.classList.contains('accessibility-panel') || el.closest('.accessibility-panel') || el.closest('.accessibility-fab')) {
            return ''; // Don't speak widget itself unless clicked directly inside it
        }

        const tagName = el.tagName.toLowerCase();
        let prefix = '';
        let content = '';

        // Extract meaningful content
        if (tagName === 'input' || tagName === 'select') {
            const labelEl = document.querySelector(`label[for="${el.id}"]`) || el.closest('label');
            const labelText = labelEl ? labelEl.textContent.trim() : '';
            const type = el.getAttribute('type') || '';
            const placeholder = el.getAttribute('placeholder') || '';
            const value = el.value || '';

            if (tagName === 'select') {
                const selectedText = el.options[el.selectedIndex]?.text || '';
                prefix = 'Caixa de seleção';
                content = `${labelText}. Opção selecionada: ${selectedText}`;
            } else if (type === 'checkbox') {
                prefix = 'Caixa de seleção marcardora';
                content = `${labelText}. Status: ${el.checked ? 'Marcado' : 'Desmarcado'}`;
            } else if (type === 'radio') {
                prefix = 'Botão de opção';
                content = `${labelText}. Status: ${el.checked ? 'Selecionado' : 'Não selecionado'}`;
            } else {
                prefix = `Campo de texto ${labelText ? 'para ' + labelText : ''}`;
                content = value ? `Valor atual: ${value}` : (placeholder ? `Dica: ${placeholder}` : 'Vazio');
            }
        } else if (tagName === 'button' || el.classList.contains('btn')) {
            prefix = 'Botão';
            content = el.textContent.trim() || el.getAttribute('aria-label') || el.getAttribute('title') || '';
        } else if (tagName === 'a') {
            prefix = 'Link';
            content = el.textContent.trim() || el.getAttribute('aria-label') || el.getAttribute('title') || '';
        } else if (tagName.match(/^h[1-6]$/)) {
            const level = tagName.substring(1);
            prefix = `Título nível ${level}`;
            content = el.textContent.trim();
        } else if (tagName === 'th') {
            prefix = 'Cabeçalho da tabela';
            content = el.textContent.trim();
        } else if (tagName === 'td') {
            prefix = 'Célula';
            content = el.textContent.trim();
        } else {
            content = el.textContent.trim();
        }

        // Return combined string
        return prefix ? `${prefix}: ${content}` : content;
    }

    // Highlight helper
    let currentHighlightedEl = null;

    function highlightElement(el) {
        removeHighlight();
        if (!settings.screenReader) return;
        el.classList.add('speech-highlight');
        currentHighlightedEl = el;
    }

    function removeHighlight() {
        if (currentHighlightedEl) {
            currentHighlightedEl.classList.remove('speech-highlight');
            currentHighlightedEl = null;
        }
    }

    // Core Speech listeners
    function handleElementMouseEnter(e) {
        if (!settings.screenReader || settings.readerMode !== 'hover') return;
        e.stopPropagation(); // Avoid bubbling up
        const text = getSpeechTextForElement(this);
        if (text) {
            speak(text);
            highlightElement(this);
        }
    }

    function handleElementMouseLeave(e) {
        if (!settings.screenReader || settings.readerMode !== 'hover') return;
        e.stopPropagation();
        removeHighlight();
        stopSpeaking();
    }

    function handleElementClick(e) {
        if (!settings.screenReader) return;
        
        // If screen reader is active and mode is click
        if (settings.readerMode === 'click') {
            e.stopPropagation();
            const text = getSpeechTextForElement(this);
            if (text) {
                speak(text);
                highlightElement(this);
                // Remove highlight after 2.5s automatically
                setTimeout(removeHighlight, 2500);
            }
        }
    }

    // Attach/Detach event listeners on all text-bearing elements
    const elementsSelector = 'p, h1, h2, h3, h4, h5, h6, label, a, button, .btn, td, th, input:not([type="hidden"]), select, span:not(.acc-slider):not(.accessibility-fab i)';
    
    function attachSpeechListeners() {
        const elements = document.querySelectorAll(elementsSelector);
        elements.forEach(el => {
            el.addEventListener('mouseenter', handleElementMouseEnter);
            el.addEventListener('mouseleave', handleElementMouseLeave);
            el.addEventListener('click', handleElementClick);
        });
    }

    function detachSpeechListeners() {
        removeHighlight();
        const elements = document.querySelectorAll(elementsSelector);
        elements.forEach(el => {
            el.removeEventListener('mouseenter', handleElementMouseEnter);
            el.removeEventListener('mouseleave', handleElementMouseLeave);
            el.removeEventListener('click', handleElementClick);
        });
    }

    // Apply styles to document based on settings state
    function applyAccessibilityStyles() {
        // High Contrast
        if (settings.highContrast) {
            document.body.classList.add('high-contrast');
        } else {
            document.body.classList.remove('high-contrast');
        }

        // Grayscale
        if (settings.grayscale) {
            document.body.classList.add('grayscale');
        } else {
            document.body.classList.remove('grayscale');
        }

        // Dyslexia Font
        if (settings.dyslexiaFont) {
            document.body.classList.add('dyslexia-font');
        } else {
            document.body.classList.remove('dyslexia-font');
        }

        // Highlight Links
        if (settings.highlightLinks) {
            document.body.classList.add('highlight-links');
        } else {
            document.body.classList.remove('highlight-links');
        }

        // Font Size
        if (settings.fontSizeScale === 1.0) {
            document.documentElement.style.fontSize = '';
        } else {
            document.documentElement.style.fontSize = (settings.fontSizeScale * 100) + '%';
        }

        // Reading Guide Ruler
        const guideLine = document.getElementById('reading-guide-line');
        if (guideLine) {
            if (settings.readingGuide) {
                guideLine.style.display = 'block';
            } else {
                guideLine.style.display = 'none';
            }
        }

        // Speech Listeners
        if (settings.screenReader) {
            attachSpeechListeners();
        } else {
            detachSpeechListeners();
        }
    }

    // Save settings helper
    function saveSettings() {
        localStorage.setItem('stockflow_acc_settings', JSON.stringify(settings));
        applyAccessibilityStyles();
    }

    // UI Panel Creation
    function createAccessibilityUI() {
        // 1. Reading Guide Line
        if (!document.getElementById('reading-guide-line')) {
            const guide = document.createElement('div');
            guide.id = 'reading-guide-line';
            guide.className = 'reading-guide-line';
            document.body.appendChild(guide);

            // Track mouse to move guide
            window.addEventListener('mousemove', (e) => {
                if (settings.readingGuide) {
                    guide.style.top = e.clientY + 'px';
                }
            });
        }

        // 2. FAB Button
        // 2. FAB Button and Toggle for Screen Reader
        const fab = document.createElement('button');
        fab.className = 'accessibility-fab';
        fab.id = 'accessibility-fab';
        fab.setAttribute('aria-label', 'Abrir Painel de Acessibilidade');
        fab.setAttribute('title', 'Acessibilidade');
        fab.innerHTML = '<i class="fa-solid fa-universal-access"></i>';
        document.body.appendChild(fab);

        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'accessibility-toggle-btn';
        toggleBtn.className = 'accessibility-toggle-btn';
        toggleBtn.setAttribute('aria-label', 'Ativar/Desativar Leitor de Tela');
        toggleBtn.title = 'Leitor de Tela';
        toggleBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
        
        document.body.appendChild(toggleBtn);

        const initToggleIcon = () => {
            const accScreenReader = document.getElementById('acc-screen-reader');
            if (!accScreenReader) return;
            toggleBtn.innerHTML = accScreenReader.checked ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
        };

        toggleBtn.addEventListener('click', () => {
            const accScreenReader = document.getElementById('acc-screen-reader');
            if (!accScreenReader) return;
            const newState = !accScreenReader.checked;
            accScreenReader.checked = newState;
            // Dispatch change event to trigger existing handler
            accScreenReader.dispatchEvent(new Event('change'));
        });


        // 3. Panel Container
        const panel = document.createElement('div');
        panel.className = 'accessibility-panel';
        panel.id = 'accessibility-panel';
        panel.setAttribute('aria-hidden', 'true');
        panel.innerHTML = `
            <div class="accessibility-header">
                <h3><i class="fa-solid fa-universal-access"></i> Acessibilidade</h3>
                <button class="accessibility-close" id="accessibility-close" aria-label="Fechar Painel de Acessibilidade" title="Fechar">&times;</button>
            </div>
            <div class="accessibility-body">
                <!-- LEITOR DE TELA (Speech Synthesizer) -->
                <div>
                    <div class="accessibility-section-title">
                        <i class="fa-solid fa-volume-high"></i> Leitor de Tela (Voz)
                    </div>
                    <div class="accessibility-row">
                        <div class="accessibility-label">
                            <span class="accessibility-label-title">Leitor de Tela</span>
                            <span class="accessibility-label-desc">Sintetizador de voz integrado</span>
                        </div>
                        <label class="acc-switch">
                            <input type="checkbox" id="acc-screen-reader">
                            <span class="acc-slider"></span>
                        </label>
                    </div>
                    
                    <div class="accessibility-row">
                        <div class="accessibility-label">
                            <span class="accessibility-label-title">Modo de Leitura</span>
                        </div>
                        <div class="acc-select-wrapper">
                            <select id="acc-reader-mode" class="acc-select">
                                <option value="hover">Falar ao passar o mouse</option>
                                <option value="click">Falar ao clicar no elemento</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="speed-slider-wrapper">
                        <div class="speed-slider-row">
                            <span>Velocidade de Leitura</span>
                            <span id="speed-val">1.0x</span>
                        </div>
                        <input type="range" id="acc-reader-speed" class="speed-slider" min="0.5" max="2.0" step="0.25" value="1.0">
                    </div>

                    <div class="speech-actions">
                        <button id="acc-speech-stop" class="btn-acc btn-speech-stop" title="Parar Leitura">
                            <i class="fa-solid fa-circle-stop"></i> Parar Leitura
                        </button>
                    </div>
                </div>

                <!-- VISUAL ADJUSTMENTS -->
                <div>
                    <div class="accessibility-section-title">
                        <i class="fa-solid fa-eye"></i> Ajustes Visuais
                    </div>
                    
                    <div class="accessibility-row">
                        <div class="accessibility-label">
                            <span class="accessibility-label-title">Alto Contraste</span>
                            <span class="accessibility-label-desc">Otimiza as cores para leitura</span>
                        </div>
                        <label class="acc-switch">
                            <input type="checkbox" id="acc-high-contrast">
                            <span class="acc-slider"></span>
                        </label>
                    </div>
                    
                    <div class="accessibility-row">
                        <div class="accessibility-label">
                            <span class="accessibility-label-title">Escala de Cinza</span>
                            <span class="accessibility-label-desc">Remove as cores do sistema</span>
                        </div>
                        <label class="acc-switch">
                            <input type="checkbox" id="acc-grayscale">
                            <span class="acc-slider"></span>
                        </label>
                    </div>

                    <div class="accessibility-row">
                        <div class="accessibility-label">
                            <span class="accessibility-label-title">Links Destacados</span>
                            <span class="accessibility-label-desc">Sublinha links e botões</span>
                        </div>
                        <label class="acc-switch">
                            <input type="checkbox" id="acc-highlight-links">
                            <span class="acc-slider"></span>
                        </label>
                    </div>
                </div>

                <!-- READING AIDS -->
                <div>
                    <div class="accessibility-section-title">
                        <i class="fa-solid fa-book-open"></i> Auxiliares de Leitura
                    </div>
                    
                    <div class="accessibility-row">
                        <div class="accessibility-label">
                            <span class="accessibility-label-title">Guia de Leitura</span>
                            <span class="accessibility-label-desc">Régua horizontal para foco visual</span>
                        </div>
                        <label class="acc-switch">
                            <input type="checkbox" id="acc-reading-guide">
                            <span class="acc-slider"></span>
                        </label>
                    </div>

                    <div class="accessibility-row">
                        <div class="accessibility-label">
                            <span class="accessibility-label-title">Fonte para Dislexia</span>
                            <span class="accessibility-label-desc">Usa tipografia simplificada</span>
                        </div>
                        <label class="acc-switch">
                            <input type="checkbox" id="acc-dyslexia">
                            <span class="acc-slider"></span>
                        </label>
                    </div>

                    <div style="margin-top: 0.5rem;">
                        <span class="accessibility-label-title" style="font-size: 0.9rem; font-weight: 600; display: block; margin-bottom: 0.5rem;">Tamanho do Texto</span>
                        <div class="text-size-controls">
                            <button id="size-normal" class="btn-acc">Normal</button>
                            <button id="size-large" class="btn-acc">Grande (A+)</button>
                            <button id="size-larger" class="btn-acc">Muito Grande (A++)</button>
                        </div>
                    </div>
                </div>

                <!-- RESET -->
                <button class="accessibility-reset-btn" id="accessibility-reset">
                    <i class="fa-solid fa-rotate-left"></i> Redefinir Acessibilidade
                </button>
            </div>
        `;
                document.body.appendChild(panel);
        initToggleIcon(); // Ensure toggle icon reflects saved state

        // Bind interactive events
        const togglePanel = () => {
            const isOpen = panel.classList.contains('open');
            if (isOpen) {
                panel.classList.remove('open');
                panel.setAttribute('aria-hidden', 'true');
                fab.focus();
            } else {
                panel.classList.add('open');
                panel.setAttribute('aria-hidden', 'false');
                document.getElementById('acc-screen-reader').focus();
            }
        };

        fab.addEventListener('click', togglePanel);
        if (document.getElementById('sidebar-acc-toggle')) {
    document.getElementById('sidebar-acc-toggle').addEventListener('click', togglePanel);
}
        document.getElementById('accessibility-close').addEventListener('click', togglePanel);

        // Keyboard shortcut Ctrl+Alt+A to toggle panel
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                togglePanel();
                return;
            }
            if (e.key === 'Escape' && panel.classList.contains('open')) {
                togglePanel();
            }
        });

        // Toggles inputs matching state
        const accScreenReader = document.getElementById('acc-screen-reader');
        const accReaderMode = document.getElementById('acc-reader-mode');
        const accReaderSpeed = document.getElementById('acc-reader-speed');
        const speedValText = document.getElementById('speed-val');
        const accHighContrast = document.getElementById('acc-high-contrast');
        const accGrayscale = document.getElementById('acc-grayscale');
        const accHighlightLinks = document.getElementById('acc-highlight-links');
        const accReadingGuide = document.getElementById('acc-reading-guide');
        const accDyslexia = document.getElementById('acc-dyslexia');

        // Set inputs to initial loaded settings
        accScreenReader.checked = settings.screenReader;
        accReaderMode.value = settings.readerMode;
        accReaderSpeed.value = settings.readerSpeed;
        speedValText.textContent = settings.readerSpeed.toFixed(2) + 'x';
        accHighContrast.checked = settings.highContrast;
        accGrayscale.checked = settings.grayscale;
        accHighlightLinks.checked = settings.highlightLinks;
        accReadingGuide.checked = settings.readingGuide;
        accDyslexia.checked = settings.dyslexiaFont;

        // Apply visual button state for sizes
        const updateSizeButtonState = () => {
            document.querySelectorAll('.text-size-controls button').forEach(b => b.classList.remove('active'));
            if (settings.fontSizeScale === 1.0) {
                document.getElementById('size-normal').classList.add('active');
            } else if (settings.fontSizeScale === 1.15) {
                document.getElementById('size-large').classList.add('active');
            } else if (settings.fontSizeScale === 1.30) {
                document.getElementById('size-larger').classList.add('active');
            }
        };
        updateSizeButtonState();

        // Listeners for widget UI elements
        accScreenReader.addEventListener('change', (e) => {
            // Update toggle button appearance
            if (toggleBtn) {
                toggleBtn.innerHTML = accScreenReader.checked ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
            }
            settings.screenReader = e.target.checked;
            saveSettings();
            // Update toggle button visual pulse when screen reader active
            if (toggleBtn) {
                if (settings.screenReader) {
                    toggleBtn.classList.add('pulse');
                } else {
                    toggleBtn.classList.remove('pulse');
                }
            }
            if (settings.screenReader) {
                speak("Leitor de tela ativado.");
            } else {
                stopSpeaking();
                if (toggleBtn) toggleBtn.classList.remove('pulse');
            }
        });

        accReaderMode.addEventListener('change', (e) => {
            settings.readerMode = e.target.value;
            saveSettings();
            speak(`Modo de leitura alterado para: ${settings.readerMode === 'hover' ? 'passar o mouse' : 'clicar'}.`);
        });

        accReaderSpeed.addEventListener('input', (e) => {
            // Update toggle button state if needed
            if (toggleBtn) {
                // No visual change needed for speed
            }
            const val = parseFloat(e.target.value);
            settings.readerSpeed = val;
            speedValText.textContent = val.toFixed(2) + 'x';
        });

        accReaderSpeed.addEventListener('change', () => {
            saveSettings();
            speak("Velocidade de leitura atualizada.");
        });

        document.getElementById('acc-speech-stop').addEventListener('click', () => {
            stopSpeaking();
            removeHighlight();
        });

        accHighContrast.addEventListener('change', (e) => {
            settings.highContrast = e.target.checked;
            saveSettings();
        });

        accGrayscale.addEventListener('change', (e) => {
            settings.grayscale = e.target.checked;
            saveSettings();
        });

        accHighlightLinks.addEventListener('change', (e) => {
            settings.highlightLinks = e.target.checked;
            saveSettings();
        });

        accReadingGuide.addEventListener('change', (e) => {
            settings.readingGuide = e.target.checked;
            saveSettings();
        });

        accDyslexia.addEventListener('change', (e) => {
            settings.dyslexiaFont = e.target.checked;
            saveSettings();
        });

        document.getElementById('size-normal').addEventListener('click', () => {
            settings.fontSizeScale = 1.0;
            saveSettings();
            updateSizeButtonState();
        });

        document.getElementById('size-large').addEventListener('click', () => {
            settings.fontSizeScale = 1.15;
            saveSettings();
            updateSizeButtonState();
        });

        document.getElementById('size-larger').addEventListener('click', () => {
            settings.fontSizeScale = 1.30;
            saveSettings();
            updateSizeButtonState();
        });

        // Ensure pulse class reflects saved state on init
        if (settings.screenReader && toggleBtn) {
            toggleBtn.classList.add('pulse');
        }

        // Reset settings
        document.getElementById('accessibility-reset').addEventListener('click', () => {
            stopSpeaking();
            settings = {
                screenReader: false,
                readerMode: 'hover',
                readerSpeed: 1.0,
                highContrast: false,
                grayscale: false,
                dyslexiaFont: false,
                highlightLinks: false,
                readingGuide: false,
                fontSizeScale: 1.0
            };
            
            // Sync UI inputs
            accScreenReader.checked = false;
            accReaderMode.value = 'hover';
            accReaderSpeed.value = 1.0;
            speedValText.textContent = '1.00x';
            accHighContrast.checked = false;
            accGrayscale.checked = false;
            accHighlightLinks.checked = false;
            accReadingGuide.checked = false;
            accDyslexia.checked = false;
            updateSizeButtonState();
            
            saveSettings();
            speak("Configurações de acessibilidade redefinidas.");
        });
    }

    // Initialize once DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            createAccessibilityUI();
            applyAccessibilityStyles();
        });
    } else {
        createAccessibilityUI();
        applyAccessibilityStyles();
    }
})();
