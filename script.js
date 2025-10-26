 document.addEventListener('DOMContentLoaded', () => {
            // Zamanlayıcı Ayarları
            const POMODORO_DURATIONS = {
                pomodoro: 25 * 60, // 25 dakika
                shortBreak: 5 * 60, // 5 dakika
            };

            let currentMode = 'pomodoro';
            let timeLeft = POMODORO_DURATIONS[currentMode];
            let timerInterval = null;
            let isRunning = false;
            let pomodoroCount = 0;

            // DOM Elementleri
            const body = document.body;
            const timeDisplay = document.getElementById('time');
            const durationLabel = document.getElementById('duration-label');
            const domatesElement = document.getElementById('domates');
            const startStopButton = document.getElementById('start-stop-button');
            const resetButton = document.getElementById('reset-button');
            const modeButton = document.getElementById('mode-button');
            const themeButton = document.getElementById('toggle-theme');
            const themeIcon = themeButton.querySelector('i'); // Font Awesome ikonunu seç
            const startStopIcon = startStopButton.querySelector('i');
            const ringtoneSelect = document.getElementById('zil-sesi');

            // Zil Sesleri (Tone.js)
            const bells = new Tone.MembraneSynth({
                oscillator: { type: "square" },
                envelope: { attack: 0.02, decay: 0.4, sustain: 0.05, release: 0.5 },
            }).toDestination();
            const chimes = new Tone.PluckSynth({
                attackNoise: 1, dampening: 2000, resonance: 0.9,
            }).toDestination();
            const synths = new Tone.Synth().toDestination();
            const pingPong = new Tone.PingPongDelay("4n", 0.2).toDestination();
            const drum = new Tone.MembraneSynth().connect(pingPong);
            drum.triggerAttackRelease("C4", "32n");

            /**
             * Ses çalar ve tarayıcının ses bağlamını (AudioContext) başlatır.
             * @param {'end' | 'start'} type - Çalınacak ses türü.
             */
            function playAlert(type) {
               
                if (Tone.context.state !== 'running') {
                    Tone.context.resume().then(() => {
                        triggerSound(type);
                    });
                } else {
                    triggerSound(type);
                }
            }

            function triggerSound(type) {
                const selectedRingtone = ringtoneSelect.value;

                if (type === 'end') {
                    bells.triggerAttackRelease("C4", "8n");
                    bells.triggerAttackRelease("E4", "8n", "+0.2");
                    bells.triggerAttackRelease("G4", "8n", "+0.4");
                } else if (type === 'start') {
                    if (selectedRingtone === 'chime') {
                        chimes.triggerAttackRelease("E5", "16n");
                    } else if (selectedRingtone === 'synth') {
                        synths.triggerAttackRelease("A3", "16n");
                    } else if (selectedRingtone === 'bell') {
                        synths.triggerAttackRelease("C4", "16n");
                    }
                }
            }


            function updateDisplay() {
                const minutes = Math.floor(timeLeft / 60);
                const seconds = timeLeft % 60;
                timeDisplay.textContent =
                    `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

                document.title = `(${timeDisplay.textContent}) - Pomodoro`;
            }

            /**
             * Zamanlayıcıyı başlatır/durdurur.
             */
            function toggleTimer() {
                if (isRunning) {
                    // Durdurma
                    clearInterval(timerInterval);
                    startStopButton.innerHTML = `<i class="fas fa-play"></i> Devam Et`;
                    startStopButton.setAttribute('data-state', 'stopped');
                    durationLabel.style.opacity = '1';
                } else {
                    // Başlatma
                    timerInterval = setInterval(countdown, 1000);
                    startStopButton.innerHTML = `<i class="fas fa-pause"></i> Durdur`;
                    startStopButton.setAttribute('data-state', 'running');
                    playAlert('start');

                    durationLabel.style.opacity = '0';

                    // Eğer Pomodoro ise animasyonu başlat/güncelle
                    if (currentMode === 'pomodoro') {
                        updateModeStyle();
                    }
                }
                isRunning = !isRunning;
            }

            /**
             * Her saniye çalışan ana geri sayım döngüsü.
             */
            function countdown() {
                if (timeLeft > 0) {
                    timeLeft--;
                } else {
                    clearInterval(timerInterval);
                    isRunning = false;
                    startStopButton.innerHTML = `<i class="fas fa-play"></i> Başlat`;
                    startStopButton.setAttribute('data-state', 'stopped');

                    playAlert('end');
                    handleTimerEnd();
                }
                updateDisplay();
            }

            /**
             * Zamanlayıcı sıfırlanır.
             */
            function resetTimer() {
                clearInterval(timerInterval);
                isRunning = false;
                currentMode = 'pomodoro';
                timeLeft = POMODORO_DURATIONS[currentMode];

                startStopButton.innerHTML = `<i class="fas fa-play"></i> Başlat`;
                startStopButton.setAttribute('data-state', 'stopped');

                updateModeStyle(true); // Sıfırlama ile yeşil rengi zorla ve etiketleri güncelle
                updateDisplay();

                // Domatesi varsayılan haline döndür
                domatesElement.classList.remove('falling');
                domatesElement.style.animation = 'none';
                durationLabel.style.opacity = '1';
            }

            /**
             * Mod değişimini yönetir ve zamanı günceller.
             */
            function switchMode(newMode) {
                clearInterval(timerInterval);
                isRunning = false;
                currentMode = newMode;
                timeLeft = POMODORO_DURATIONS[currentMode];

                startStopButton.innerHTML = `<i class="fas fa-play"></i> Başlat`;
                startStopButton.setAttribute('data-state', 'stopped');

                updateModeStyle(true); // Mod değiştiğinde yeşil rengi zorla ve etiketleri güncelle
                updateDisplay();

                domatesElement.classList.remove('falling');
                domatesElement.style.animation = 'none';
                durationLabel.style.opacity = '1';
            }

            /**
             * Zamanlayıcı bittiğinde sonraki modu seçer, skor günceller ve düşüş animasyonunu tetikler.
             */
            function handleTimerEnd() {
                let nextMode;
                if (currentMode === 'pomodoro') {
                    pomodoroCount++;
                    triggerTomatoFall();
                    nextMode = 'shortBreak';
                } else {
                    nextMode = 'pomodoro';
                }

                // 3 saniye sonra otomatik geçiş
                setTimeout(() => {
                    switchMode(nextMode);
                    // İstenirse otomatik başlatılabilir, şu an için durdurulmuş kalıyor.
                }, 3000);
            }

            /**
             * Mod butonunun stilini ve domates animasyonunu günceller.
             * @param {boolean} forceGreen - Rengi yeşile zorla (sıfırlama veya mod geçişi için).
             */
            function updateModeStyle(forceGreen = false) {
                if (currentMode === 'pomodoro') {
                    // Pomodoro Modu (25 Dakika)
                    modeButton.innerHTML = `<i class="fas fa-mug-hot"></i> Mola Moduna Geç`;
                    durationLabel.textContent = '25 DAKİKA ÇALIŞMA';
                    modeButton.setAttribute('data-mode', 'pomodoro');

                    if (!isRunning || forceGreen) {
                        // Durdurulduysa veya sıfırlandıysa, animasyonu sıfırla (yeşil yap)
                        domatesElement.style.animation = 'none';
                        domatesElement.style.background = `radial-gradient(circle at 30% 30%, var(--color-leaf-green-light), var(--color-leaf-green-dark) 60%, #33691e 90%)`;
                    } else {
                        // Çalışıyorsa olgunlaşma animasyonunu ekle
                        const duration = timeLeft;
                        domatesElement.style.animation = `${body.classList.contains('dark-mode') ? 'dark-ripen' : 'ripen'} ${duration}s linear forwards`;
                        domatesElement.classList.add('ripen-animation');
                    }


                } else {
                    // Mola Modu (5 Dakika)
                    modeButton.innerHTML = `<i class="fas fa-briefcase"></i> Pomodoro Moduna Geç`;
                    durationLabel.textContent = '5 DAKİKA MOLA';
                    modeButton.setAttribute('data-mode', 'shortBreak');

                    // Mola: Domatesi yeşil tut ve animasyonu kaldır
                    domatesElement.classList.remove('ripen-animation');
                    domatesElement.style.animation = 'none';
                    domatesElement.style.background = `radial-gradient(circle at 30% 30%, #9ccc65, #689f38 60%, #33691e 90%)`;
                }
            }

            /**
             * Tema değiştirme (Aydınlık/Karanlık)
             */
            function toggleTheme() {
                const isDarkMode = body.classList.toggle('dark-mode');

                if (isDarkMode) {
                    themeIcon.classList.remove('fa-sun');
                    themeIcon.classList.add('fa-moon');
                } else {
                    themeIcon.classList.remove('fa-moon');
                    themeIcon.classList.add('fa-sun');
                }

                localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');

                // Animasyon rengini temaya göre güncelle
                if (currentMode === 'pomodoro' && isRunning) {
                    updateModeStyle();
                }
            }

            /**
             * Domatesin kaybolma animasyonunu tetikler.
             */
            function triggerTomatoFall() {
                const fallingTomato = domatesElement.cloneNode(true);
                fallingTomato.id = '';

                const domatesRect = domatesElement.getBoundingClientRect();

                fallingTomato.style.position = 'fixed';
                fallingTomato.style.top = domatesRect.top + 'px';
                fallingTomato.style.left = domatesRect.left + 'px';
                fallingTomato.style.zIndex = '100';

                // Olgunlaşmış (Kırmızı) rengi ver
                fallingTomato.style.animation = 'none';
                fallingTomato.style.background = body.classList.contains('dark-mode')
                    ? `radial-gradient(circle at 30% 30%, #d55f5f, #b32e2e 60%, #9a2525 90%)`
                    : `radial-gradient(circle at 30% 30%, #ef9a9a, #e57373 60%, #d32f2f 90%)`;

                const timeElement = fallingTomato.querySelector('#time');
                if (timeElement) timeElement.remove();

                document.body.appendChild(fallingTomato);
                fallingTomato.classList.add('falling');

                fallingTomato.addEventListener('animationend', () => {
                    fallingTomato.remove();
                });

                // Ana domatesi hemen yeşile döndür
                updateModeStyle(true);
            }


            /**
             * Ayarları localStorage'dan yükler.
             */
            function loadSettings() {
                // Karanlık Mod
                const savedTheme = localStorage.getItem('darkMode');
                const isDarkMode = savedTheme === 'enabled';
                if (isDarkMode) {
                    body.classList.add('dark-mode');
                    themeIcon.classList.remove('fa-sun');
                    themeIcon.classList.add('fa-moon');
                } else {
                    themeIcon.classList.remove('fa-moon');
                    themeIcon.classList.add('fa-sun');
                }

                // Zil Sesi
                const savedRingtone = localStorage.getItem('ringtone');
                if (savedRingtone) {
                    ringtoneSelect.value = savedRingtone;
                }
            }


            // --- Event Listener'lar ---
            startStopButton.addEventListener('click', toggleTimer);
            resetButton.addEventListener('click', resetTimer);
            themeButton.addEventListener('click', toggleTheme);

            modeButton.addEventListener('click', () => {
                // Mod butonu tıklandığında sadece modu değiştirir, zamanlayıcıyı başlatmaz
                if (currentMode === 'pomodoro') {
                    switchMode('shortBreak');
                } else {
                    switchMode('pomodoro');
                }
            });

            ringtoneSelect.addEventListener('change', () => {
                localStorage.setItem('ringtone', ringtoneSelect.value);
                playAlert('start');
            });


            // --- Başlangıç Yüklemesi ---
            loadSettings();
            updateModeStyle(true);
            updateDisplay();
        });
