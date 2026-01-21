document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username');
    const mode = urlParams.get('mode');

    if (!username) {
        alert("Silakan login terlebih dahulu.");
        window.location.href = 'index.html';
        return;
    }

    // Global variables
    window.gameMode = mode || 'tebak';
    window.currentQuestion = 0;
    window.score = 0;
    window.quizQuestions = [];
    window.nextTimer = null;

    // Elements
    const playBtn = document.getElementById('play-audio-btn');
    const audioPlayer = document.getElementById('quran-audio');
    const arabicDisplay = document.getElementById('arabic-display');
    const homeBtn = document.getElementById('home-btn');

    // Start Fetching
    fetchQuizData();

    // Event Listeners
    homeBtn.onclick = () => {
        if(window.nextTimer) clearTimeout(window.nextTimer);
        window.location.href = 'index.html';
    };

    playBtn.onclick = () => {
        audioPlayer.play();
        playBtn.innerHTML = "<span>🔊</span> Sedang Memutar...";
        playBtn.disabled = true;
        audioPlayer.onended = () => {
            playBtn.innerHTML = "<span>▶</span> Putar Ulang";
            playBtn.disabled = false;
        };
    };
});

async function fetchQuizData() {
    try {
        const resList = await fetch('https://equran.id/api/v2/surat');
        const listData = await resList.json();
        const allSurahs = listData.data;

        window.quizQuestions = [];
        for(let i=0; i<10; i++) {
            const randomSurah = allSurahs[Math.floor(Math.random() * allSurahs.length)];
            const resDetail = await fetch(`https://equran.id/api/v2/surat/${randomSurah.nomor}`);
            const detailData = await resDetail.json();
            const detail = detailData.data;
            const ayatList = detail.ayat;

            const maxIdx = window.gameMode === 'sambung' ? ayatList.length - 2 : ayatList.length - 1;
            const idx = Math.floor(Math.random() * (maxIdx + 1));
            const target = ayatList[idx];

            if (window.gameMode === 'tebak') {
                window.quizQuestions.push({
                    surahName: detail.namaLatin,
                    arabic: target.teksArab,
                    trans: target.teksIndonesia,
                    audio: target.audio['01'],
                    correct: `Ayat ${target.nomorAyat}`,
                    options: shuffle([
                        `Ayat ${target.nomorAyat}`,
                        `Ayat ${getRand(1, detail.jumlahAyat, target.nomorAyat)}`,
                        `Ayat ${getRand(1, detail.jumlahAyat, target.nomorAyat)}`,
                        `Ayat ${getRand(1, detail.jumlahAyat, target.nomorAyat)}`
                    ])
                });
            } else {
                const next = ayatList[idx+1];
                window.quizQuestions.push({
                    surahName: detail.namaLatin,
                    arabic: target.teksArab,
                    trans: target.teksIndonesia,
                    audio: target.audio['01'],
                    correct: next.teksArab,
                    options: shuffle([
                        next.teksArab,
                        ayatList[Math.floor(Math.random()*ayatList.length)].teksArab,
                        ayatList[Math.floor(Math.random()*ayatList.length)].teksArab,
                        ayatList[Math.floor(Math.random()*ayatList.length)].teksArab
                    ])
                });
            }
        }
        startQuiz();
    } catch (err) {
        console.error(err);
        alert("Gagal mengambil data. Pastikan internet Anda aktif.");
        window.location.href = 'index.html';
    }
}

function startQuiz() {
    document.getElementById('loading-container').classList.remove('active');
    document.getElementById('quiz-container').classList.add('active');
    renderQuestion();
}

function renderQuestion() {
    const data = window.quizQuestions[window.currentQuestion];
    document.getElementById('surah-info-text').innerText = `Surat ${data.surahName}`;
    document.getElementById('arabic-display').innerText = data.arabic;
    document.getElementById('translation-display').innerHTML = `<strong style="display:block; margin-bottom:8px; color:#4CAF50; font-style:normal;">Terjemahan:</strong> ${data.trans}`;
    document.getElementById('progress-bar').style.width = `${(window.currentQuestion + 1) * 10}%`;
    
    const questionLabel = document.getElementById('question-label');
    if (window.gameMode === 'sambung') {
        questionLabel.innerText = "Dengarkan suara & pilih kelanjutan ayatnya:";
    } else {
        questionLabel.innerText = "Berdasarkan ayat di atas, ayat berapakah ini?";
    }
    
    const audioPlayer = document.getElementById('quran-audio');
    audioPlayer.src = data.audio;
    const playBtn = document.getElementById('play-audio-btn');
    playBtn.innerHTML = "<span>▶</span> Putar Suara Ayat";
    playBtn.disabled = false;

    const container = document.getElementById('answers-container');
    container.innerHTML = '';
    data.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'answer-btn';
        if (window.gameMode === 'sambung') btn.classList.add('arabic-mode');
        btn.innerText = opt;
        btn.onclick = () => handleAnswer(opt, data.correct, btn);
        container.appendChild(btn);
    });
}

function handleAnswer(selected, correct, btn) {
    const audioPlayer = document.getElementById('quran-audio');
    audioPlayer.pause();
    const allBtns = document.querySelectorAll('.answer-btn');
    allBtns.forEach(b => b.disabled = true);

    if (selected === correct) {
        btn.classList.add('correct');
        window.score += 10;
        document.getElementById('score-val').innerText = window.score;
    } else {
        btn.classList.add('incorrect');
        allBtns.forEach(b => { if(b.innerText === correct) b.classList.add('correct'); });
    }

    window.nextTimer = setTimeout(() => {
        window.currentQuestion++;
        if (window.currentQuestion < 10) renderQuestion();
        else showFinal();
    }, 1800);
}

function showFinal() {
    document.getElementById('quiz-container').classList.remove('active');
    document.getElementById('result-container').classList.add('active');
    document.getElementById('final-score').innerText = window.score;
    document.getElementById('final-msg').innerText = window.score >= 70 ? "MasyaAllah! Hafalanmu sangat bagus. pertahankan ya!😊" : "Semangat! Teruslah membaca dan menghafal.";
}

function shuffle(arr) { return arr.sort(() => Math.random() - 0.5); }
function getRand(min, max, exc) {
    if (max <= 1) return 1;
    let r = Math.floor(Math.random() * (max - min + 1)) + min;
    return r === exc ? getRand(min, max, exc) : r;
}