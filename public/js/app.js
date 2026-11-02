/**
 * G'oyalar Banki - Main SPA Orchestrator
 */

class App {
  constructor() {
    this.page = 'home';
    this.categories = [];
    this.stats = null;
    this.uploadedFile = null;
    this.activeIdeaCategory = 'all';
    this.jarInstance = null;

    this.init();
  }

  async init() {
    this.bindEvents();
    this.registerPWA();
    await this.loadInitialData();

    // Direct routing: /admin or #admin
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code') || urlParams.get('track') || urlParams.get('id');
    const isDirectAdmin = window.location.pathname.startsWith('/admin') || window.location.hash === '#admin';
    const startPage = codeParam ? 'track' : (isDirectAdmin ? 'admin' : (window.location.hash.replace('#', '').split('?')[0] || 'home'));
    this.setPage(startPage);

    // Auto-search if tracking code passed in query or hash
    if (codeParam) {
      setTimeout(() => {
        const trackInput = document.getElementById('track-input');
        if (trackInput) {
          trackInput.value = codeParam;
          this.trackIdea();
        }
      }, 300);
    }

    // Auto welcome from Cefrbek on visit if not directly opening admin or track
    if (!isDirectAdmin && !codeParam) {
      setTimeout(() => {
        if (window.Cefrbek) {
          window.Cefrbek.playWelcome();
        }
      }, 1200);
    }
  }

  registerPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then((reg) => {
          console.log('PWA Service Worker faol: iOS/Android/Windows tayyor', reg.scope);
        }).catch((err) => {
          console.warn('PWA Service Worker xatolik:', err);
        });
      });
    }
  }

  bindEvents() {
    // Navigation clicks
    document.querySelectorAll('[data-page]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const targetPage = el.getAttribute('data-page');
        this.setPage(targetPage);
      });
    });

    // Hash change routing
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '') || 'home';
      this.setPage(hash, false);
    });

    // Cefrbek global transfer
    window.cefrbekTransferIdea = (idea) => {
      if (window.Cefrbek) window.Cefrbek.closeChatModal();
      this.setPage('submit');
      setTimeout(() => {
        if (idea.title) document.getElementById('form-title').value = idea.title;
        if (idea.problem) document.getElementById('form-problem').value = idea.problem;
        if (idea.description) document.getElementById('form-description').value = idea.description;
        if (idea.expected_result) document.getElementById('form-expected').value = idea.expected_result;
        
        // Select category
        const catSelect = document.getElementById('form-category');
        if (catSelect && idea.category_slug) {
          const opt = Array.from(catSelect.options).find(o => o.dataset.slug === idea.category_slug);
          if (opt) catSelect.value = opt.value;
        }

        alert("✦ Cefrbek g‘oyangiz ma'lumotlarini arizaga kiritdi! Maktab va ismingizni to'ldirib, yuborishingiz mumkin.");
      }, 200);
    };

    window.seferbekTransferIdea = window.cefrbekTransferIdea; // Backward compatibility
  }

  async loadInitialData() {
    try {
      const [catsRes, statsRes] = await Promise.all([
        API.getCategories(),
        API.getStats()
      ]);

      this.categories = catsRes.categories || [];
      this.stats = statsRes;

      this.renderCategoriesGrid();
      this.populateCategoryDropdown();
      this.updateStatsCounters();
    } catch (e) {
      console.warn("Error loading initial data:", e);
    }
  }

  setPage(pageName, updateHash = true) {
    this.page = pageName;
    if (updateHash) {
      window.location.hash = pageName;
    }

    // Hide all view sections
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.style.display = 'none';
    });

    // Update nav links active state
    document.querySelectorAll('.nav-link').forEach(link => {
      if (link.getAttribute('data-page') === pageName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Show target section
    const target = document.getElementById(`view-${pageName}`);
    if (target) {
      target.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Initialize 3D jar if on home
    if (pageName === 'home') {
      if (!this.jarInstance) {
        setTimeout(() => {
          this.jarInstance = new window.IdeaJar3D('jar-canvas');
        }, 100);
      }
      this.renderFeaturedIdeas();
    } else if (pageName === 'ideas') {
      this.loadPublicIdeas();
    } else if (pageName === 'admin') {
      window.AdminController.init();
    }
  }

  updateStatsCounters() {
    if (!this.stats) return;
    const totalEl = document.getElementById('stat-total-ideas');
    const reviewEl = document.getElementById('stat-review-ideas');
    const approvedEl = document.getElementById('stat-approved-ideas');
    const catEl = document.getElementById('stat-category-count');

    if (totalEl) totalEl.innerText = this.stats.total_ideas || 0;
    if (reviewEl) reviewEl.innerText = this.stats.review_ideas || 0;
    if (approvedEl) approvedEl.innerText = this.stats.approved_ideas || 0;
    if (catEl) catEl.innerText = (this.categories && this.categories.length) || 8;
  }

  renderCategoriesGrid() {
    const grid = document.getElementById('categories-grid');
    if (!grid || !this.categories.length) return;

    grid.innerHTML = this.categories.map(cat => `
      <div class="category-card" onclick="window.app.filterByCategory('${cat.slug}')" style="cursor: pointer;">
        <div class="cat-top">
          <div class="cat-icon-wrap" style="color: ${cat.color};">${cat.icon}</div>
          <span class="cat-count">${cat.ideas_count || 0} ta g‘oya</span>
        </div>
        <h4>${cat.name}</h4>
        <p>${cat.description}</p>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 12px; font-weight: 700; color: var(--gold-light);">G‘oyalarni ko‘rish →</span>
          <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); window.app.preselectCategoryAndSubmit(${cat.id});">
            G‘oya berish ✦
          </button>
        </div>
      </div>
    `).join('');
  }

  populateCategoryDropdown() {
    const select = document.getElementById('form-category');
    if (!select || !this.categories.length) return;

    select.innerHTML = '<option value="">Yo‘nalishni tanlang...</option>' + 
      this.categories.map(cat => `
        <option value="${cat.id}" data-slug="${cat.slug}">${cat.icon} ${cat.name}</option>
      `).join('');
  }

  renderFeaturedIdeas() {
    const container = document.getElementById('featured-ideas-list');
    if (!container || !this.stats || !this.stats.featured_ideas) return;

    const ideas = this.stats.featured_ideas;
    if (ideas.length === 0) {
      container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 20px;">Hozircha ma‘qullangan tashabbuslar yo‘q.</p>';
      return;
    }

    container.innerHTML = ideas.map(idea => `
      <div class="glass" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span class="eyebrow-badge" style="margin: 0; font-size: 10px; padding: 4px 10px;">${idea.category_icon} ${idea.category_name}</span>
            <span style="color: var(--gold-primary); font-size: 13px; font-weight: 700;">❤️ ${idea.likes_count}</span>
          </div>
          <h4 style="font-size: 18px; margin-bottom: 10px; color: #ffffff;">${idea.title}</h4>
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin-bottom: 16px;">
            ${(idea.description || '').substring(0, 110)}...
          </p>
        </div>
        <button class="btn btn-outline btn-sm" onclick="window.app.openPublicIdeaModal(${JSON.stringify(idea).replace(/"/g, '&quot;')})">
          Batafsil o‘qish ✦
        </button>
      </div>
    `).join('');
  }

  // --- Ideas Catalog View ---
  async loadPublicIdeas() {
    const container = document.getElementById('public-ideas-container');
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; padding: 50px; color: var(--gold-light);">G‘oyalar yuklanmoqda... ✦</div>';

    const search = document.getElementById('catalog-search')?.value || '';
    const cat = this.activeIdeaCategory;

    try {
      const res = await API.getPublicIdeas(cat, search);
      const ideas = res.ideas || [];

      if (ideas.length === 0) {
        container.innerHTML = `
          <div class="empty" style="text-align: center; padding: 60px 20px;">
            <div style="font-size: 40px; margin-bottom: 15px; color: var(--gold-primary);">✦</div>
            <h3 style="font-size: 22px; margin-bottom: 8px;">Ushbu yo‘nalishda hozircha tasdiqlangan g‘oyalar yo‘q</h3>
            <p style="color: #94a3b8; margin-bottom: 20px;">Birinchi bo‘lib o‘z tashabbusingizni yuboring!</p>
            <button class="btn btn-primary" onclick="window.app.setPage('submit')">✦ G‘OYA YUBORISH</button>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px;">
          ${ideas.map(idea => `
            <div class="glass" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between; border-radius: var(--radius-lg);">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                  <span class="eyebrow-badge" style="margin: 0; font-size: 11px;">
                    ${idea.category_icon} ${idea.category_name}
                  </span>
                  <button class="btn btn-sm btn-outline" onclick="window.app.likeIdea(${idea.id}, this)" style="border-radius: 20px; padding: 4px 12px;">
                    ❤️ <span class="like-counter">${idea.likes_count}</span>
                  </button>
                </div>
                <h4 style="font-size: 19px; margin-bottom: 10px; color: #ffffff;">${idea.title}</h4>
                <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin-bottom: 16px;">
                  ${(idea.description || '').substring(0, 130)}...
                </p>
              </div>
              <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 11px; color: #64748b;">${(idea.created_at || '').substring(0, 10)}</span>
                <button class="btn btn-secondary btn-sm" onclick="window.app.openPublicIdeaModal(${JSON.stringify(idea).replace(/"/g, '&quot;')})">
                  Batafsil o‘qish →
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div style="color: var(--danger); text-align: center; padding: 40px;">Xatolik: ${e.message}</div>`;
    }
  }

  filterByCategory(slug) {
    this.activeIdeaCategory = slug;
    this.setPage('ideas');

    // Update filter tabs
    document.querySelectorAll('.cat-pill').forEach(pill => {
      if (pill.getAttribute('data-cat') === slug) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });

    this.loadPublicIdeas();
  }

  preselectCategoryAndSubmit(catId) {
    this.setPage('submit');
    setTimeout(() => {
      const select = document.getElementById('form-category');
      if (select) select.value = catId;
    }, 150);
  }

  async likeIdea(id, btn) {
    try {
      const res = await API.likeIdea(id);
      if (res && res.likes_count !== undefined) {
        const counter = btn.querySelector('.like-counter');
        if (counter) counter.innerText = res.likes_count;
        btn.classList.add('btn-primary');
        btn.classList.remove('btn-outline');
      }
    } catch (e) {}
  }

  openPublicIdeaModal(idea) {
    const modal = document.getElementById('public-idea-modal');
    const body = document.getElementById('public-modal-body');
    if (!modal || !body) return;

    body.innerHTML = `
      <div style="margin-bottom: 18px;">
        <span class="eyebrow-badge">${idea.category_icon} ${idea.category_name}</span>
        <h2 style="font-size: 26px; margin: 10px 0 16px;">${idea.title}</h2>
      </div>

      <div style="display: flex; flex-direction: column; gap: 18px; font-size: 14px; line-height: 1.7;">
        <div>
          <strong style="color: var(--gold-light); display: block; margin-bottom: 4px;">Muammo ifodasi:</strong>
          <p style="background: rgba(13,21,38,0.7); padding: 14px; border-radius: 12px;">${idea.problem}</p>
        </div>

        <div>
          <strong style="color: var(--gold-light); display: block; margin-bottom: 4px;">Tashabbus mazmuni:</strong>
          <p style="background: rgba(13,21,38,0.7); padding: 14px; border-radius: 12px;">${idea.description}</p>
        </div>

        <div>
          <strong style="color: var(--gold-light); display: block; margin-bottom: 4px;">Kutilayotgan natijalar:</strong>
          <p style="background: rgba(13,21,38,0.7); padding: 14px; border-radius: 12px;">${idea.expected_result}</p>
        </div>
      </div>
    `;

    modal.classList.add('active');
  }

  // --- Idea Submission Form ---
  async handleFileUpload(file) {
    if (!file) return;
    const infoEl = document.getElementById('file-upload-info');
    if (infoEl) {
      infoEl.innerHTML = `<em>Yuklanmoqda: ${file.name}...</em>`;
    }

    try {
      const res = await API.uploadFile(file);
      this.uploadedFile = res;
      if (infoEl) {
        infoEl.innerHTML = `
          <div class="file-preview">
            <span>📎 ${res.filename}</span>
            <button class="btn btn-outline btn-sm" onclick="window.app.removeUploadedFile()">✕</button>
          </div>
        `;
      }
    } catch (err) {
      alert("Fayl yuklashda xatolik: " + err.message);
      if (infoEl) infoEl.innerHTML = '';
    }
  }

  removeUploadedFile() {
    this.uploadedFile = null;
    const infoEl = document.getElementById('file-upload-info');
    if (infoEl) infoEl.innerHTML = '';
  }

  async submitIdeaForm(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-idea');
    if (btn) {
      btn.disabled = true;
      btn.innerText = 'Yuborilmoqda... ✦';
    }

    const payload = {
      school: document.getElementById('form-school').value.trim(),
      class_name: document.getElementById('form-class').value.trim(),
      first_name: document.getElementById('form-fname').value.trim(),
      last_name: document.getElementById('form-lname').value.trim(),
      title: document.getElementById('form-title').value.trim(),
      category_id: parseInt(document.getElementById('form-category').value, 10),
      problem: document.getElementById('form-problem').value.trim(),
      description: document.getElementById('form-description').value.trim(),
      expected_result: document.getElementById('form-expected').value.trim(),
      attachment_url: this.uploadedFile ? this.uploadedFile.url : '',
      attachment_name: this.uploadedFile ? this.uploadedFile.filename : ''
    };

    try {
      const res = await API.submitIdea(payload);
      if (res && res.success) {
        // Show celebration success modal
        this.showSuccessModal(res.tracking_code);
        // Reset form
        document.getElementById('idea-submit-form').reset();
        this.removeUploadedFile();
        // Refresh stats
        this.loadInitialData();
      } else {
        alert("Server xatosi: G'oya yuborilmadi.");
      }
    } catch (err) {
      alert("Xatolik yuz berdi: " + err.message + "\nG‘oya serverga saqlanmadi.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerText = '✦ G‘OYANI YUBORISH ✦';
      }
    }
  }

  showSuccessModal(trackingCode) {
    const modal = document.getElementById('success-modal');
    const codeEl = document.getElementById('success-tracking-code');
    if (codeEl) codeEl.innerText = trackingCode;
    if (modal) modal.classList.add('active');
  }

  copyTrackingCode() {
    const codeEl = document.getElementById('success-tracking-code');
    if (codeEl) {
      navigator.clipboard.writeText(codeEl.innerText);
      alert(`G‘oya ID nusxalandi: ${codeEl.innerText}`);
    }
  }

  // --- Tracking View ---
  async trackIdea() {
    const input = document.getElementById('track-input');
    const resultBox = document.getElementById('track-result');
    if (!input || !resultBox) return;

    const code = input.value.trim();
    if (!code) {
      alert("Iltimos, g‘oya ID raqamini kiriting!");
      return;
    }

    resultBox.innerHTML = '<div style="text-align: center; color: var(--gold-light);">Tekshirilmoqda... ✦</div>';

    try {
      const res = await API.trackIdea(code);
      const idea = res.idea;

      let statusBadge = 'badge-pending';
      let stepActive = 2; // review
      if (idea.status === 'Ma‘qullandi') {
        statusBadge = 'badge-approved';
        stepActive = 3;
      } else if (idea.status === 'Rad etildi') {
        statusBadge = 'badge-rejected';
        stepActive = 3;
      }

      resultBox.innerHTML = `
        <div class="glass" style="padding: 30px; margin-top: 25px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
            <div>
              <span class="eyebrow-badge" style="margin: 0;">${idea.category_icon || '✦'} ${idea.category_name}</span>
              <h3 style="font-size: 22px; margin-top: 8px;">${idea.title}</h3>
            </div>
            <span class="badge ${statusBadge}" style="font-size: 13px; padding: 6px 16px;">${idea.status}</span>
          </div>

          <!-- Progress Timeline -->
          <div style="display: flex; justify-content: space-between; position: relative; margin: 35px 0 25px;">
            <div style="position: absolute; top: 18px; left: 10%; right: 10%; height: 2px; background: rgba(255,255,255,0.1); z-index: 1;"></div>
            
            <div style="text-align: center; z-index: 2; flex: 1;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: #10b981; color: white; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; font-weight: 700;">✓</div>
              <div style="font-size: 12px; font-weight: 700;">1. Yuborildi</div>
              <div style="font-size: 10px; color: #94a3b8;">${(idea.created_at || '').substring(0, 10)}</div>
            </div>

            <div style="text-align: center; z-index: 2; flex: 1;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: ${stepActive >= 2 ? 'var(--gold-primary)' : 'rgba(255,255,255,0.1)'}; color: #120e06; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; font-weight: 700;">
                ${stepActive >= 2 ? '2' : '○'}
              </div>
              <div style="font-size: 12px; font-weight: 700;">2. Kengash ko‘rib chiqmoqda</div>
              <div style="font-size: 10px; color: #94a3b8;">Koordinator ekspertizasi</div>
            </div>

            <div style="text-align: center; z-index: 2; flex: 1;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: ${stepActive === 3 ? (idea.status === 'Ma‘qullandi' ? '#10b981' : '#ef4444') : 'rgba(255,255,255,0.1)'}; color: white; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; font-weight: 700;">
                ${stepActive === 3 ? (idea.status === 'Ma‘qullandi' ? '✓' : '✕') : '3'}
              </div>
              <div style="font-size: 12px; font-weight: 700;">3. Yakuniy Xulosa</div>
              <div style="font-size: 10px; color: #94a3b8;">${idea.status}</div>
            </div>
          </div>

          <!-- Javob va Xulosa Bloki -->
          ${idea.status === 'Ma‘qullandi' ? `
            <div style="background: linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,150,105,0.1)); border: 2px solid #10b981; border-radius: 16px; padding: 22px; margin-top: 24px; text-align: center;">
              <div style="font-size: 38px; margin-bottom: 6px;">🎉</div>
              <div style="font-size: 22px; font-weight: 900; color: #34d399; letter-spacing: 0.5px; margin-bottom: 6px;">
                G‘OYANGIZ MA‘QULLANDI!
              </div>
              <p style="color: #e2e8f0; font-size: 14px; margin: 0 auto 12px; max-width: 520px; line-height: 1.6;">
                Tabriklaymiz! Siz yuborgan g‘oya O‘quvchilar kengashi va ekspertlar tomonidan o‘rganilib, <strong>maqullandi</strong> deb baholandi.
              </p>

              ${idea.latest_comment ? `
                <div style="background: rgba(13,21,38,0.85); border-radius: 12px; padding: 16px; margin-top: 14px; text-align: left; border-left: 4px solid var(--gold-primary);">
                  <div style="font-weight: 800; color: var(--gold-light); font-size: 14px; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                    <span>💬</span> <span>Admin xabari:</span>
                  </div>
                  <p style="color: #ffffff; font-size: 15px; line-height: 1.6; margin: 0; font-weight: 500;">
                    "${idea.latest_comment}"
                  </p>
                  ${idea.admin_name ? `
                    <div style="text-align: right; font-size: 12px; color: #94a3b8; margin-top: 8px;">
                      — <strong>${idea.admin_name}</strong> (${idea.admin_role === 'super_admin' ? "Asosiy Admin / IT va Sun'iy intellekt koordinatori" : "Yo‘nalish koordinatori"})
                    </div>
                  ` : ''}
                </div>
              ` : `
                <div style="font-size: 12px; color: #a7f3d0; margin-top: 8px;">
                  ✦ Loyihani amaliyotga tatbiq etish bo‘yicha maktab ma'muriyati va siz bilan bog‘laniladi.
                </div>
              `}
            </div>
          ` : idea.status === 'Rad etildi' ? `
            <div style="background: linear-gradient(135deg, rgba(239,68,68,0.18), rgba(185,28,28,0.1)); border: 2px solid #ef4444; border-radius: 16px; padding: 22px; margin-top: 24px; text-align: center;">
              <div style="font-size: 34px; margin-bottom: 6px;">❌</div>
              <div style="font-size: 20px; font-weight: 900; color: #f87171; margin-bottom: 6px;">
                G‘OYA RAD ETILDI
              </div>
              ${idea.latest_comment ? `
                <div style="background: rgba(13,21,38,0.85); border-radius: 12px; padding: 16px; margin-top: 14px; text-align: left; border-left: 4px solid #ef4444;">
                  <div style="font-weight: 800; color: #f87171; font-size: 13px; margin-bottom: 6px;">
                    💬 Admin xabari (Rad etilish sababi):
                  </div>
                  <p style="color: #ffffff; font-size: 14px; margin: 0;">"${idea.latest_comment}"</p>
                  ${idea.admin_name ? `
                    <div style="text-align: right; font-size: 11px; color: #94a3b8; margin-top: 6px;">
                      — <strong>${idea.admin_name}</strong>
                    </div>
                  ` : ''}
                </div>
              ` : `
                <p style="color: #94a3b8; font-size: 13px; margin: 0;">Ushbu taklif mezonlarga mos kelmagani sababli qabul qilinmadi.</p>
              `}
            </div>
          ` : `
            <div style="background: linear-gradient(135deg, rgba(245,158,11,0.15), rgba(180,83,9,0.1)); border: 2px solid #f59e0b; border-radius: 16px; padding: 20px; margin-top: 24px; text-align: center;">
              <div style="font-size: 32px; margin-bottom: 6px;">⏳</div>
              <div style="font-size: 19px; font-weight: 900; color: #fbbf24; margin-bottom: 6px;">
                KO‘RIB CHIQILMOQDA
              </div>
              <p style="color: #cbd5e1; font-size: 13px; margin: 0;">
                G‘oyangiz koordinator ekspertizasida. Natija yaqin vaqt ichida e'lon qilinadi.
              </p>
              ${idea.latest_comment ? `
                <div style="background: rgba(13,21,38,0.85); border-radius: 12px; padding: 14px; margin-top: 14px; text-align: left; border-left: 4px solid #f59e0b;">
                  <div style="font-weight: 800; color: #fbbf24; font-size: 13px; margin-bottom: 4px;">Admin xabari:</div>
                  <p style="color: #ffffff; font-size: 14px; margin: 0;">"${idea.latest_comment}"</p>
                </div>
              ` : ''}
            </div>
          `}
        </div>
      `;
    } catch (err) {
      resultBox.innerHTML = `
        <div style="padding: 20px; text-align: center; color: var(--danger); background: rgba(239,68,68,0.1); border-radius: 12px; margin-top: 20px;">
          ✕ ${err.message}
        </div>
      `;
    }
  }
}

// Start app once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
