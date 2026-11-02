/**
 * Cefrbek AI Assistant Controller
 * Features:
 * - Uzbek voice greeting and speech synthesis (Web Speech API)
 * - Voice input recognition (mic STT)
 * - Conversational UI, Idea categorization & smart suggestions
 * - 1-Click transfer to Idea Submission Form
 */

class CefrbekController {
  constructor() {
    this.history = [];
    this.isListening = false;
    this.voiceEnabled = true;
    this.recognition = null;
    this.initSpeech();
  }

  initSpeech() {
    // Speech Recognition setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'uz-UZ';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      this.recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        const input = document.getElementById('cefrbek-input') || document.getElementById('seferbek-input');
        if (input) {
          input.value = text;
          this.sendMessage();
        }
      };

      this.recognition.onerror = (e) => {
        console.warn('Speech recognition error:', e);
        this.setListening(false);
      };

      this.recognition.onend = () => {
        this.setListening(false);
      };
    }
  }

  setListening(listening) {
    this.isListening = listening;
    const micBtn = document.getElementById('cefrbek-mic-btn') || document.getElementById('seferbek-mic-btn');
    if (micBtn) {
      if (listening) {
        micBtn.classList.add('active');
        micBtn.innerHTML = '🔴 Tinglanmoqda...';
      } else {
        micBtn.classList.remove('active');
        micBtn.innerHTML = '🎙️ Ovozli';
      }
    }
  }

  toggleVoiceInput() {
    if (!this.recognition) {
      alert("Brauzeringizda ovozli yozish qo'llab-quvvatlanmaydi. Chrome, Edge yoki Safari brauzeridan foydalaning.");
      return;
    }
    if (this.isListening) {
      this.recognition.stop();
      this.setListening(false);
    } else {
      try {
        this.recognition.start();
        this.setListening(true);
      } catch (e) {
        console.warn(e);
      }
    }
  }

  speak(text) {
    if (!this.voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.text = text.replace(/[*_#✦🌱🤖🤝🎭🎙️⚡👑🎯👥📊]/g, '');
      utterance.rate = 1.0;
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const uzVoice = voices.find(v => v.lang.startsWith('uz') || v.lang.startsWith('tr') || v.lang.startsWith('ru'));
      if (uzVoice) utterance.voice = uzVoice;

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS error:', e);
    }
  }

  async playWelcome() {
    try {
      const data = await API.cefrbekWelcome ? await API.cefrbekWelcome() : await API.seferbekWelcome();
      if (data && data.voice_text) {
        this.speak(data.voice_text);
      }
    } catch (e) {}
  }

  openChatModal() {
    const modal = document.getElementById('cefrbek-modal') || document.getElementById('seferbek-modal');
    if (modal) {
      modal.classList.add('active');
      const messagesContainer = document.getElementById('cefrbek-messages') || document.getElementById('seferbek-messages');
      if (messagesContainer && messagesContainer.children.length === 0) {
        this.addAiMessage("Assalomu alaykum! Men Cefrbek — sening AI yordamchingman. Bugun maktabingiz yoki jamiyatimizni yaxshilash uchun qanday yangi g‘oyangiz bor? Uni birgalikda muhokama qilamiz!");
      }
    }
  }

  closeChatModal() {
    const modal = document.getElementById('cefrbek-modal') || document.getElementById('seferbek-modal');
    if (modal) {
      modal.classList.remove('active');
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
  }

  addUserMessage(text) {
    const container = document.getElementById('cefrbek-messages') || document.getElementById('seferbek-messages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'chat-bubble bubble-user';
    div.innerText = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  addAiMessage(text, structuredIdea = null, improvements = []) {
    const container = document.getElementById('cefrbek-messages') || document.getElementById('seferbek-messages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'chat-bubble bubble-ai';

    let html = `<p>${text.replace(/\n/g, '<br/>')}</p>`;

    if (improvements && improvements.length > 0) {
      html += `
        <div class="ai-recommendation-box">
          <div class="ai-rec-title">💡 Cefrbekdan 3 ta tavsiya:</div>
          <ul style="padding-left: 18px; margin: 6px 0;">
            ${improvements.map(imp => `<li style="margin-bottom: 5px;">${imp}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (structuredIdea && structuredIdea.title) {
      html += `
        <div style="margin-top: 12px; display: flex; gap: 8px;">
          <button class="btn btn-primary btn-sm" onclick="window.cefrbekTransferIdea(${JSON.stringify(structuredIdea).replace(/"/g, '&quot;')})">
            ✦ Formaga ko‘chirish
          </button>
        </div>
      `;
    }

    div.innerHTML = html;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;

    this.speak(text);
  }

  async sendMessage() {
    const input = document.getElementById('cefrbek-input') || document.getElementById('seferbek-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    this.addUserMessage(text);

    const container = document.getElementById('cefrbek-messages') || document.getElementById('seferbek-messages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-bubble bubble-ai';
    typingDiv.id = 'cefrbek-typing';
    typingDiv.innerHTML = '<em>Cefrbek o‘ylamoqda... ✦</em>';
    container.appendChild(typingDiv);
    container.scrollTop = container.scrollHeight;

    try {
      const res = await (API.cefrbekChat ? API.cefrbekChat(text, this.history) : API.seferbekChat(text, this.history));
      const el = document.getElementById('cefrbek-typing') || document.getElementById('seferbek-typing');
      if (el) el.remove();

      if (res && res.reply) {
        this.addAiMessage(res.reply, res.structured_idea, res.improvements);
        this.history.push({ role: 'user', content: text });
        this.history.push({ role: 'assistant', content: res.reply });
      } else {
        this.addAiMessage("Ajoyib fikr! G'oyangizni yanada kengroq tavsiflab bering.");
      }
    } catch (err) {
      const el = document.getElementById('cefrbek-typing') || document.getElementById('seferbek-typing');
      if (el) el.remove();
      this.addAiMessage("Uzr, bog'lanishda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.");
    }
  }
}

window.Cefrbek = new CefrbekController();
window.Seferbek = window.Cefrbek; // Aliased for full backwards compatibility
