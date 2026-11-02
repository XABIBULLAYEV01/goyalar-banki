/**
 * Admin & Coordinator Panels Controller
 * Cross-Platform Mobile & Desktop App (iOS, Android, Windows)
 * Strict Server-Side & UI-Side RBAC
 */

const AdminController = {
  currentUser: null,
  currentIdeas: [],
  currentTab: 'ideas', // 'ideas', 'profile', 'coordinators', 'logs', 'stats'
  viewMode: window.innerWidth < 768 ? 'cards' : 'table', // 'cards' (touch mobile) or 'table' (desktop)
  deferredPrompt: null,

  init() {
    this.setupPwaInstall();
    this.checkSession();
  },

  setupPwaInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      const banner = document.getElementById('pwa-install-banner');
      if (banner) banner.style.display = 'flex';
    });
  },

  async promptInstallApp() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const choice = await this.deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.style.display = 'none';
      }
      this.deferredPrompt = null;
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS) {
        alert("📲 iOS (iPhone/iPad) da o‘rnatish uchun:\n\n1. Safari pastki panelidagi 'Ulashish' (Share) belgisini bosing.\n2. Ro‘yxatdan 'Bosh ekranga qo‘shish' (Add to Home Screen) ni tanlang.\n3. 'Qo‘shish' tugmasini bosing — ilova telefoningizga o‘rnatiladi!");
      } else {
        alert("💻 Ushbu ilovani kompyuteringiz (Windows/Mac) yoki Android telefoningizga o‘rnatish uchun brauzeringiz menyusidan 'Ilovani o‘rnatish' (Install App) tugmasini bosing.");
      }
    }
  },

  async checkSession() {
    try {
      const res = await API.getAdminMe();
      if (res && res.user) {
        this.currentUser = res.user;
        this.renderAdminView();
      } else {
        this.renderLoginView();
      }
    } catch (e) {
      this.renderLoginView();
    }
  },

  async login(username, password) {
    const errorEl = document.getElementById('login-error');
    if (errorEl) errorEl.style.display = 'none';

    try {
      const res = await API.adminLogin(username, password);
      if (res && res.user) {
        this.currentUser = res.user;
        window.app.setPage('admin');
        this.renderAdminView();
      }
    } catch (err) {
      if (errorEl) {
        errorEl.innerText = err.message || "Login yoki parol noto'g'ri!";
        errorEl.style.display = 'block';
      }
    }
  },

  async logout() {
    await API.adminLogout();
    this.currentUser = null;
    const bottomNav = document.getElementById('admin-bottom-nav');
    if (bottomNav) bottomNav.remove();
    window.app.setPage('home');
  },

  renderLoginView() {
    const container = document.getElementById('admin-container');
    if (!container) return;

    const bottomNav = document.getElementById('admin-bottom-nav');
    if (bottomNav) bottomNav.remove();

    container.innerHTML = `
      <div style="max-width: 460px; margin: 30px auto; padding: 32px 24px;" class="glass glass-gold">
        <div style="text-align: center; margin-bottom: 24px;">
          <div class="logo-icon" style="margin: 0 auto 12px;">🔐</div>
          <h2 style="font-size: 24px; margin-bottom: 4px;">ADMIN TIZIMI</h2>
          <p style="color: #cbd5e1; font-size: 13px;">Loyiha Muallifi va Bosh Admin: <strong style="color: var(--gold-light);">Azizbek Xabibullayev</strong></p>
          <div style="margin-top: 8px;">
            <span class="badge badge-approved" style="font-size: 10px;">iOS • Android • Windows</span>
          </div>
        </div>

        <div id="login-error" style="display: none; padding: 12px; border-radius: 10px; background: rgba(239,68,68,0.15); border: 1px solid var(--danger); color: #f87171; font-size: 13px; margin-bottom: 18px; text-align: center;"></div>

        <form onsubmit="event.preventDefault(); window.AdminController.login(document.getElementById('admin-user').value, document.getElementById('admin-pass').value);">
          <div class="form-group">
            <label class="form-label">Login yoki Email</label>
            <input id="admin-user" class="form-control" placeholder="azizbekxabibullayev419@gmail.com" required autocomplete="username" />
          </div>

          <div class="form-group">
            <label class="form-label">Parol</label>
            <input id="admin-pass" type="password" class="form-control" placeholder="••••••••••••" required autocomplete="current-password" />
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px; padding: 14px; font-size: 15px;">
            TASDIQLASH VA KIRISH ✦
          </button>
        </form>

        <div style="margin-top: 25px; padding-top: 18px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: #94a3b8;">
          <div style="font-weight: 700; color: var(--gold-light); margin-bottom: 8px;">🚀 Tezkor Kirish Hisoblari:</div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button class="btn btn-primary btn-sm" style="text-align: left; justify-content: flex-start; padding: 10px 14px;" onclick="document.getElementById('admin-user').value='azizbekxabibullayev419@gmail.com'; document.getElementById('admin-pass').value='Azizbekkk12@';">
              👑 Asosiy Admin / IT & AI (azizbekxabibullayev419@gmail.com)
            </button>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button class="btn btn-outline btn-sm" onclick="document.getElementById('admin-user').value='coord_talim'; document.getElementById('admin-pass').value='Talim2026!';">
                🎓 Ta'lim
              </button>
              <button class="btn btn-outline btn-sm" onclick="document.getElementById('admin-user').value='coord_ekologiya'; document.getElementById('admin-pass').value='Ekologiya2026!';">
                🌱 Ekologiya
              </button>
              <button class="btn btn-outline btn-sm" onclick="document.getElementById('admin-user').value='coord_ijtimoiy'; document.getElementById('admin-pass').value='Ijtimoiy2026!';">
                🤝 Ijtimoiy
              </button>
              <button class="btn btn-outline btn-sm" onclick="document.getElementById('admin-user').value='coord_sport'; document.getElementById('admin-pass').value='Sport2026!';">
                ⚡ Sport
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderAdminView() {
    const container = document.getElementById('admin-container');
    if (!container || !this.currentUser) return;

    const isSuper = this.currentUser.role === 'super_admin';
    const roleTitle = isSuper 
      ? "👑 BOSH BOSHQARUVCHI (SUPER ADMIN)" 
      : `🛡️ ${this.currentUser.category_name ? this.currentUser.category_name.toUpperCase() : 'YO‘NALISH'} KOORDINATORI`;

    container.innerHTML = `
      <!-- PWA Install Banner -->
      <div id="pwa-install-banner" class="pwa-install-banner" style="display: flex;">
        <div class="pwa-banner-info">
          <div class="pwa-banner-icon">📲</div>
          <div>
            <div style="font-weight: 800; font-size: 14px; color: #ffffff;">Admin Panel Ilovasini O‘rnatish</div>
            <div style="font-size: 12px; color: #94a3b8;">iOS (iPhone), Android va Windows tizimlarida mustaqil ilova sifatida ishlaydi</div>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-primary btn-sm" onclick="window.AdminController.promptInstallApp()">
            ✦ O‘rnatish
          </button>
          <button class="btn btn-outline btn-sm" onclick="document.getElementById('pwa-install-banner').style.display='none'">
            ✕
          </button>
        </div>
      </div>

      <!-- Admin Top Header -->
      <div class="admin-header glass" style="margin-bottom: 20px; border-radius: 16px;">
        <div>
          <div class="eyebrow-badge" style="margin-bottom: 4px;">${roleTitle}</div>
          <h2 style="font-size: 22px; margin-bottom: 2px;">${this.currentUser.full_name}</h2>
          <p style="color: #94a3b8; font-size: 12px;">Login: <code style="color: var(--gold-light);">${this.currentUser.username}</code> • Status: <span style="color: #34d399;">Faol</span></p>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-secondary btn-sm" onclick="window.AdminController.downloadExcel()">
            📥 Excel hisobot
          </button>
          <button class="btn btn-outline btn-sm" onclick="window.AdminController.logout()">
            🚪 Chiqish
          </button>
        </div>
      </div>

      <!-- Navigation Tabs (Desktop & Tablet) -->
      <div class="glass" style="padding: 10px 16px; margin-bottom: 24px; display: flex; gap: 8px; overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 14px;">
        <button class="btn ${this.currentTab === 'ideas' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="window.AdminController.switchTab('ideas')">
          📋 G‘oyalar ro‘yxati
        </button>
        
        <!-- Login & Parol almashtirish menyusi -->
        <button class="btn ${this.currentTab === 'profile' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="window.AdminController.switchTab('profile')">
          👤 Login & Parolni almashtirish
        </button>

        ${isSuper ? `
          <!-- Foydalanuvchilar va Adminlar boshqaruvi -->
          <button class="btn ${this.currentTab === 'coordinators' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="window.AdminController.switchTab('coordinators')">
            👥 Foydalanuvchilar & Adminlar
          </button>
          <button class="btn ${this.currentTab === 'stats' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="window.AdminController.switchTab('stats')">
            📊 Tizim statistikasi
          </button>
          <button class="btn ${this.currentTab === 'logs' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="window.AdminController.switchTab('logs')">
            🛡️ Xavfsizlik jurnali
          </button>
        ` : ''}
      </div>

      <!-- Tab Content Area -->
      <div id="admin-tab-content">
        <!-- Rendered dynamically -->
      </div>
    `;

    this.renderCurrentTab();
    this.renderBottomNav();
  },

  renderBottomNav() {
    let existing = document.getElementById('admin-bottom-nav');
    if (existing) existing.remove();

    const isSuper = this.currentUser && this.currentUser.role === 'super_admin';

    const nav = document.createElement('div');
    nav.id = 'admin-bottom-nav';
    nav.className = 'admin-bottom-nav';

    nav.innerHTML = `
      <button class="bottom-nav-item ${this.currentTab === 'ideas' ? 'active' : ''}" onclick="window.AdminController.switchTab('ideas')">
        <span class="nav-icon">📋</span>
        <span>G‘oyalar</span>
      </button>

      <button class="bottom-nav-item ${this.currentTab === 'profile' ? 'active' : ''}" onclick="window.AdminController.switchTab('profile')">
        <span class="nav-icon">👤</span>
        <span>Profil</span>
      </button>

      ${isSuper ? `
        <button class="bottom-nav-item ${this.currentTab === 'coordinators' ? 'active' : ''}" onclick="window.AdminController.switchTab('coordinators')">
          <span class="nav-icon">👥</span>
          <span>Adminlar</span>
        </button>
        <button class="bottom-nav-item ${this.currentTab === 'stats' ? 'active' : ''}" onclick="window.AdminController.switchTab('stats')">
          <span class="nav-icon">📊</span>
          <span>Statistika</span>
        </button>
      ` : `
        <button class="bottom-nav-item" onclick="window.AdminController.downloadExcel()">
          <span class="nav-icon">📥</span>
          <span>Excel</span>
        </button>
      `}

      <button class="bottom-nav-item" onclick="window.AdminController.promptInstallApp()">
        <span class="nav-icon">📲</span>
        <span>Ilova</span>
      </button>

      <button class="bottom-nav-item" onclick="window.AdminController.logout()">
        <span class="nav-icon">🚪</span>
        <span>Chiqish</span>
      </button>
    `;

    document.body.appendChild(nav);
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.renderAdminView();
  },

  toggleViewMode(mode) {
    this.viewMode = mode;
    this.filterIdeasTable();
  },

  async renderCurrentTab() {
    const tabEl = document.getElementById('admin-tab-content');
    if (!tabEl) return;

    if (this.currentTab === 'ideas') {
      await this.renderIdeasTab(tabEl);
    } else if (this.currentTab === 'profile') {
      this.renderProfileTab(tabEl);
    } else if (this.currentTab === 'coordinators') {
      await this.renderCoordinatorsTab(tabEl);
    } else if (this.currentTab === 'stats') {
      await this.renderStatsTab(tabEl);
    } else if (this.currentTab === 'logs') {
      await this.renderLogsTab(tabEl);
    }
  },

  // 1. Profile Tab (Login & Parolni Almashtirish Menyusi)
  renderProfileTab(container) {
    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
        
        <!-- Form 1: Login / Email almashtirish -->
        <div class="glass glass-gold" style="padding: 28px; border-radius: 18px;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 18px;">
            <div style="font-size: 24px;">✏️</div>
            <div>
              <h3 style="font-size: 18px; color: var(--gold-light);">Login / Emailni Almashtirish</h3>
              <p style="color: #94a3b8; font-size: 12px;">Tizimga kirish uchun yangi login yoki email kiriting</p>
            </div>
          </div>

          <form onsubmit="event.preventDefault(); window.AdminController.submitUpdateProfile();">
            <div class="form-group">
              <label class="form-label">Joriy Login</label>
              <input class="form-control" value="${this.currentUser.username}" disabled style="opacity: 0.7;" />
            </div>

            <div class="form-group">
              <label class="form-label">Yangi Login / Email <span class="req">*</span></label>
              <input id="profile-new-username" class="form-control" placeholder="Masalan: azizbekxabibullayev419@gmail.com" required />
            </div>

            <div class="form-group">
              <label class="form-label">Ism-Familiya (F.I.SH)</label>
              <input id="profile-new-fullname" class="form-control" value="${this.currentUser.full_name}" required />
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px; padding: 14px;">
              TASDIQLASH ✦
            </button>
          </form>
        </div>

        <!-- Form 2: Parolni almashtirish -->
        <div class="glass glass-gold" style="padding: 28px; border-radius: 18px;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 18px;">
            <div style="font-size: 24px;">🔑</div>
            <div>
              <h3 style="font-size: 18px; color: var(--gold-light);">Parolni Almashtirish</h3>
              <p style="color: #94a3b8; font-size: 12px;">Xavfsizlik uchun parolni yangilang</p>
            </div>
          </div>

          <form onsubmit="event.preventDefault(); window.AdminController.submitChangePassword();">
            <div class="form-group">
              <label class="form-label">Joriy Parol <span class="req">*</span></label>
              <input id="pwd-current" type="password" class="form-control" placeholder="Joriy parolingiz" required />
            </div>

            <div class="form-group">
              <label class="form-label">Yangi Parol <span class="req">*</span></label>
              <input id="pwd-new" type="password" class="form-control" placeholder="Yangi parol (kamida 6 belgi)" required minlength="6" />
            </div>

            <div class="form-group">
              <label class="form-label">Yangi Parolni Takrorlang <span class="req">*</span></label>
              <input id="pwd-confirm" type="password" class="form-control" placeholder="Parolni qayta kiriting" required minlength="6" />
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px; padding: 14px;">
              TASDIQLASH ✦
            </button>
          </form>
        </div>

      </div>
    `;
  },

  async submitUpdateProfile() {
    const newUsername = document.getElementById('profile-new-username').value.trim();
    const newFullname = document.getElementById('profile-new-fullname').value.trim();

    if (!newUsername) {
      alert("Iltimos, yangi loginni kiriting!");
      return;
    }

    try {
      const res = await API.updateProfile(newUsername, newFullname);
      alert("✅ " + res.message);
      this.currentUser.username = res.username;
      this.currentUser.full_name = res.full_name;
      this.renderAdminView();
    } catch (err) {
      alert("Xatolik: " + err.message);
    }
  },

  async submitChangePassword() {
    const currentPassword = document.getElementById('pwd-current').value.trim();
    const newPassword = document.getElementById('pwd-new').value.trim();
    const confirmPassword = document.getElementById('pwd-confirm').value.trim();

    if (newPassword !== confirmPassword) {
      alert("Yangi parollar mos kelmadi! Iltimos, tekshirib qayta kiriting.");
      return;
    }

    try {
      const res = await API.changePassword(currentPassword, newPassword);
      alert("✅ " + res.message);
      document.getElementById('pwd-current').value = '';
      document.getElementById('pwd-new').value = '';
      document.getElementById('pwd-confirm').value = '';
    } catch (err) {
      alert("Xatolik: " + err.message);
    }
  },

  // 2. Ideas Tab
  async renderIdeasTab(container) {
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--gold-light);">G‘oyalar yuklanmoqda... ✦</div>';

    try {
      const res = await API.getAdminIdeas();
      this.currentIdeas = res.ideas || [];

      const total = this.currentIdeas.length;
      const pending = this.currentIdeas.filter(i => i.status === 'Ko‘rib chiqilmoqda').length;
      const approved = this.currentIdeas.filter(i => i.status === 'Ma‘qullandi').length;
      const rejected = this.currentIdeas.filter(i => i.status === 'Rad etildi').length;

      container.innerHTML = `
        <div class="stats-grid" style="margin-bottom: 24px;">
          <div class="glass stat-card">
            <div class="stat-value text-gold">${total}</div>
            <div class="stat-label">JAMI G‘OYALAR</div>
          </div>
          <div class="glass stat-card">
            <div class="stat-value" style="color: #fbbf24;">${pending}</div>
            <div class="stat-label">KO‘RIB CHIQILMOQDA</div>
          </div>
          <div class="glass stat-card">
            <div class="stat-value" style="color: #34d399;">${approved}</div>
            <div class="stat-label">MA‘QULLANGAN</div>
          </div>
          <div class="glass stat-card">
            <div class="stat-value" style="color: #f87171;">${rejected}</div>
            <div class="stat-label">RAD ETILGAN</div>
          </div>
        </div>

        <div class="glass" style="padding: 16px; margin-bottom: 20px; display: flex; gap: 12px; flex-wrap: wrap; align-items: center; justify-content: space-between;">
          <div style="display: flex; gap: 10px; flex: 1; min-width: 260px;">
            <input id="admin-search-input" class="form-control" placeholder="Qidiruv: nomi, ID, maktab, o'quvchi..." oninput="window.AdminController.filterIdeasTable()" />
          </div>

          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <select id="admin-status-filter" class="form-control" style="width: auto; min-width: 160px;" onchange="window.AdminController.filterIdeasTable()">
              <option value="all">Barcha holatlar</option>
              <option value="Ko‘rib chiqilmoqda">⏳ Ko‘rib chiqilmoqda</option>
              <option value="Ma‘qullandi">✅ Ma‘qullandi</option>
              <option value="Rad etildi">❌ Rad etildi</option>
            </select>

            <div class="view-mode-toggle">
              <button class="view-mode-btn ${this.viewMode === 'cards' ? 'active' : ''}" onclick="window.AdminController.toggleViewMode('cards')">
                📱 Kartalar
              </button>
              <button class="view-mode-btn ${this.viewMode === 'table' ? 'active' : ''}" onclick="window.AdminController.toggleViewMode('table')">
                📑 Jadval
              </button>
            </div>
          </div>
        </div>

        <div id="ideas-display-wrapper">
          ${this.renderIdeasContent(this.currentIdeas)}
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div style="color: var(--danger); text-align: center; padding: 30px;">Xatolik: ${e.message}</div>`;
    }
  },

  renderIdeasContent(ideas) {
    if (!ideas || ideas.length === 0) {
      return `
        <div class="glass" style="text-align: center; padding: 40px 20px; color: #94a3b8; border-radius: 16px;">
          ✦ Ushbu filtr bo‘yicha g‘oyalar topilmadi.
        </div>
      `;
    }

    if (this.viewMode === 'cards') {
      return `
        <div class="admin-cards-container">
          ${this.generateCardItems(ideas)}
        </div>
      `;
    } else {
      return `
        <div class="glass table-responsive" style="border-radius: 16px;">
          <table class="custom-table" id="admin-ideas-table">
            <thead>
              <tr>
                <th>ID Kodi</th>
                <th>O‘quvchi & Maktab</th>
                <th>Yo‘nalish</th>
                <th>G‘oya Nomi</th>
                <th>Sana</th>
                <th>Holat</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              ${this.generateTableRows(ideas)}
            </tbody>
          </table>
        </div>
      `;
    }
  },

  generateCardItems(ideas) {
    return ideas.map(idea => {
      let badgeClass = 'badge-pending';
      let borderClass = 'status-pending-border';
      if (idea.status === 'Ma‘qullandi') {
        badgeClass = 'badge-approved';
        borderClass = 'status-approved-border';
      } else if (idea.status === 'Rad etildi') {
        badgeClass = 'badge-rejected';
        borderClass = 'status-rejected-border';
      }

      return `
        <div class="admin-idea-card ${borderClass}">
          <div>
            <div class="card-header-row">
              <span class="badge ${badgeClass}">${idea.status}</span>
              <code style="color: var(--gold-primary); font-weight: 700; font-size: 13px;">${idea.tracking_code}</code>
            </div>

            <div class="card-author-block" style="margin-top: 12px;">
              <div class="card-avatar">${(idea.first_name || 'U')[0]}</div>
              <div>
                <div style="font-weight: 700; font-size: 15px; color: #ffffff;">${idea.first_name} ${idea.last_name}</div>
                <div style="font-size: 12px; color: #94a3b8;">${idea.school} (${idea.class_name})</div>
              </div>
            </div>

            <div style="margin: 12px 0 6px;">
              <span style="font-size: 11px; font-weight: 700; color: ${idea.category_color || '#e8bd68'};">
                ✦ ${idea.category_name}
              </span>
              <h4 class="card-title">${idea.title}</h4>
            </div>

            <div class="card-snippet">
              ${(idea.description || idea.problem || '').substring(0, 110)}...
            </div>

            ${idea.latest_comment ? `
              <div style="font-size: 11px; color: var(--gold-light); margin-top: 6px; padding: 6px 10px; background: rgba(232,189,104,0.1); border-radius: 8px;">
                💬 Admin xabari: "${idea.latest_comment.substring(0, 70)}..."
              </div>
            ` : ''}
          </div>

          <div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
              📅 ${(idea.created_at || '').substring(0, 16)}
            </div>

            <div class="card-quick-actions">
              <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="window.AdminController.openIdeaDetailModal(${idea.id})">
                Ko‘rish / Tasdiqlash ✦
              </button>
              
              <button class="btn btn-outline btn-sm" title="Tezkor ma'qullash" onclick="window.AdminController.quickUpdateStatus(${idea.id}, 'Ma‘qullandi')">
                ✅ Ma‘qullash
              </button>
              <button class="btn btn-outline btn-sm" title="Tezkor rad etish" onclick="window.AdminController.quickUpdateStatus(${idea.id}, 'Rad etildi')">
                ❌
              </button>
              <button class="btn btn-outline btn-sm" title="O‘chirish (Udalit)" style="color: #f87171; border-color: rgba(239,68,68,0.4);" onclick="window.AdminController.deleteIdeaAction(${idea.id}, '${idea.tracking_code}')">
                🗑️
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  generateTableRows(ideas) {
    return ideas.map(idea => {
      let badgeClass = 'badge-pending';
      if (idea.status === 'Ma‘qullandi') badgeClass = 'badge-approved';
      else if (idea.status === 'Rad etildi') badgeClass = 'badge-rejected';

      return `
        <tr>
          <td>
            <code style="color: var(--gold-primary); font-weight: 700;">${idea.tracking_code}</code>
          </td>
          <td>
            <div style="font-weight: 700; color: #ffffff;">${idea.first_name} ${idea.last_name}</div>
            <div style="font-size: 11px; color: #94a3b8;">${idea.school} (${idea.class_name})</div>
          </td>
          <td>
            <span style="font-size: 12px; font-weight: 600; color: ${idea.category_color || '#e8bd68'};">
              ${idea.category_name}
            </span>
          </td>
          <td>
            <div style="font-weight: 600; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${idea.title}
            </div>
          </td>
          <td>
            <span style="font-size: 12px; color: #94a3b8;">${(idea.created_at || '').substring(0, 16)}</span>
          </td>
          <td>
            <span class="badge ${badgeClass}">${idea.status}</span>
          </td>
          <td>
            <div style="display: flex; gap: 6px; align-items: center;">
              <button class="btn btn-secondary btn-sm" onclick="window.AdminController.openIdeaDetailModal(${idea.id})">
                Ko‘rish / Tasdiqlash ✦
              </button>
              <button class="btn btn-sm" style="background: rgba(239,68,68,0.15); border: 1px solid #ef4444; color: #f87171;" title="O‘chirish (Udalit)" onclick="window.AdminController.deleteIdeaAction(${idea.id}, '${idea.tracking_code}')">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  filterIdeasTable() {
    const search = (document.getElementById('admin-search-input')?.value || '').toLowerCase();
    const status = document.getElementById('admin-status-filter')?.value || 'all';

    const filtered = this.currentIdeas.filter(idea => {
      const matchStatus = status === 'all' || idea.status === status;
      const full = `${idea.title} ${idea.tracking_code} ${idea.first_name} ${idea.last_name} ${idea.school}`.toLowerCase();
      const matchSearch = !search || full.includes(search);
      return matchStatus && matchSearch;
    });

    const wrapper = document.getElementById('ideas-display-wrapper');
    if (wrapper) wrapper.innerHTML = this.renderIdeasContent(filtered);
  },

  async quickUpdateStatus(id, newStatus) {
    if (!confirm(`G‘oya holatini "${newStatus}"ga o‘zgartirilsinmi?`)) return;
    try {
      await API.updateIdeaStatus(id, newStatus, `G‘oya holati ${newStatus} etildi.`);
      const target = this.currentIdeas.find(i => i.id === id);
      if (target) target.status = newStatus;
      this.filterIdeasTable();
      alert(`✅ G‘oya muvaffaqiyatli ${newStatus} holatiga o‘tkazildi!`);
    } catch (e) {
      alert("Xatolik: " + e.message);
    }
  },

  // Modal Detail & Idea Confirmation
  async openIdeaDetailModal(id) {
    try {
      const res = await API.getAdminIdeaDetail(id);
      const idea = res.idea;
      const comments = res.comments || [];

      const modalContent = document.getElementById('admin-modal-body');
      if (!modalContent) return;

      modalContent.innerHTML = `
        <div style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
            <span class="eyebrow-badge" style="margin: 0;">${idea.category_name}</span>
            <code style="color: var(--gold-light); font-size: 14px; font-weight: 800;">${idea.tracking_code}</code>
          </div>
          <h2 style="font-size: 22px; margin-bottom: 12px; line-height: 1.3;">${idea.title}</h2>
          
          <div style="padding: 14px; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); margin-bottom: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
            <div>
              <strong>Muallif:</strong> ${idea.first_name} ${idea.last_name}
              <button class="btn btn-outline btn-sm" style="padding: 2px 8px; font-size: 11px; margin-left: 6px;" onclick="window.AdminController.openEditStudentNameModal(${idea.student_id}, '${idea.first_name.replace(/'/g, "\\'")}', '${idea.last_name.replace(/'/g, "\\'")}', ${idea.id})">
                ✏️ Ismni o‘zgartirish
              </button>
            </div>
            <div><strong>Sinf:</strong> ${idea.class_name}</div>
            <div><strong>Maktab:</strong> ${idea.school}</div>
            <div><strong>Sana:</strong> ${(idea.created_at || '').substring(0, 16)}</div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 22px;">
          <div>
            <div style="font-weight: 700; color: var(--gold-light); font-size: 13px; margin-bottom: 4px;">Muammo tavsifi:</div>
            <p style="background: rgba(13,21,38,0.7); padding: 12px; border-radius: 10px; font-size: 14px;">${idea.problem}</p>
          </div>

          <div>
            <div style="font-weight: 700; color: var(--gold-light); font-size: 13px; margin-bottom: 4px;">G‘oyaning to‘liq mazmuni:</div>
            <p style="background: rgba(13,21,38,0.7); padding: 12px; border-radius: 10px; font-size: 14px; line-height: 1.6;">${idea.description}</p>
          </div>

          <div>
            <div style="font-weight: 700; color: var(--gold-light); font-size: 13px; margin-bottom: 4px;">Kutilayotgan natija:</div>
            <p style="background: rgba(13,21,38,0.7); padding: 12px; border-radius: 10px; font-size: 14px;">${idea.expected_result}</p>
          </div>

          ${idea.attachment_url ? `
            <div>
              <div style="font-weight: 700; color: var(--gold-light); font-size: 13px; margin-bottom: 4px;">Biriktirilgan fayl:</div>
              <a href="${idea.attachment_url}" target="_blank" class="btn btn-outline btn-sm" download>
                📎 ${idea.attachment_name || 'Faylni ko‘rish va yuklab olish'}
              </a>
            </div>
          ` : ''}
        </div>

        <!-- Status update & student notification message -->
        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 18px;">
          <h4 style="margin-bottom: 12px; color: var(--gold-light);">G‘oyani Tasdiqlash va O‘quvchiga Javob Yozish:</h4>

          <div class="form-grid-2" style="margin-bottom: 14px;">
            <div>
              <label class="form-label">G‘oya Holati <span class="req">*</span></label>
              <select id="modal-status-select" class="form-control">
                <option value="Ma‘qullandi" ${idea.status === 'Ma‘qullandi' ? 'selected' : ''}>✅ Ma‘qullandi</option>
                <option value="Ko‘rib chiqilmoqda" ${idea.status === 'Ko‘rib chiqilmoqda' ? 'selected' : ''}>⏳ Ko‘rib chiqilmoqda</option>
                <option value="Rad etildi" ${idea.status === 'Rad etildi' ? 'selected' : ''}>❌ Rad etildi</option>
              </select>
            </div>
            <div>
              <label class="form-label">Mas'ul Admin / Koordinator</label>
              <input class="form-control" value="${this.currentUser.full_name}" disabled />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">O‘quvchiga Javob / Xabar (Ushbu xabar o‘quvchining 'G‘oyamni kuzatish' sahifasida 'Admin xabari: ...' deb ko‘rinadi)</label>
            <textarea id="modal-comment-text" class="form-control" style="min-height: 90px;" placeholder="Masalan: Tabriklaymiz! Sizning tashabbusingiz to‘liq ma‘qullandi. Loyihani amalga oshirish bo‘yicha maktab ma'muriyati va siz bilan yaqin kunlarda bog‘lanamiz."></textarea>
          </div>

          <button class="btn btn-primary" style="width: 100%; padding: 15px; font-size: 16px;" onclick="window.AdminController.saveIdeaStatus(${idea.id})">
            ✦ TASDIQLASH ✦
          </button>

          <button class="btn btn-sm" style="width: 100%; margin-top: 10px; background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.4); color: #f87171;" onclick="window.AdminController.deleteIdeaAction(${idea.id}, '${idea.tracking_code}', true)">
            🗑️ Ushbu g‘oyani tizimdan butunlay o‘chirish (Udalit qilish)
          </button>
        </div>

        ${comments.length > 0 ? `
          <div style="margin-top: 22px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 14px;">
            <h5 style="margin-bottom: 8px; color: #94a3b8;">Oldingi admin javoblari:</h5>
            ${comments.map(c => `
              <div style="background: rgba(255,255,255,0.03); padding: 10px 14px; border-radius: 8px; margin-bottom: 8px; font-size: 13px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <strong style="color: var(--gold-light);">${c.admin_name}</strong>
                  <span style="color: #64748b; font-size: 11px;">${(c.created_at || '').substring(0, 16)}</span>
                </div>
                <p>${c.comment}</p>
              </div>
            `).join('')}
          </div>
        ` : ''}
      `;

      document.getElementById('admin-idea-modal').classList.add('active');
    } catch (e) {
      alert("Xatolik: " + e.message);
    }
  },

  async saveIdeaStatus(id) {
    const status = document.getElementById('modal-status-select').value;
    const comment = document.getElementById('modal-comment-text').value.trim();

    try {
      await API.updateIdeaStatus(id, status, comment);
      document.getElementById('admin-idea-modal').classList.remove('active');
      alert(`✅ G‘oya holati muvaffaqiyatli saqlandi: ${status}! O‘quvchiga javob biriktirildi.`);
      this.renderIdeasTab(document.getElementById('admin-tab-content'));
    } catch (e) {
      alert("Saqlashda xatolik: " + e.message);
    }
  },

  async deleteIdeaAction(id, code, closeModal = false) {
    if (!confirm(`⚠️ DIQQAT! [${code}] raqamli g‘oyani tizimdan BUTUNLAY O‘CHIRISHNI (Udalit qilishni) tasdiqlaysizmi?\n\nUshbu amalni ortga qaytarib bo'lmaydi!`)) {
      return;
    }

    try {
      const res = await API.deleteIdea(id);
      alert("✅ " + (res.message || "G‘oya muvaffaqiyatli o‘chirildi!"));
      if (closeModal) {
        document.getElementById('admin-idea-modal').classList.remove('active');
      }
      this.renderIdeasTab(document.getElementById('admin-tab-content'));
    } catch (e) {
      alert("Xatolik: " + e.message);
    }
  },

  downloadExcel() {
    const url = API.getExcelExportUrl();
    window.location.href = url;
  },

  // 3. Super Admin: Coordinators & Users Tab (Admin qo'shish, Bloklash, Parol va Loginni almashtirish)
  async renderCoordinatorsTab(container) {
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--gold-light);">Foydalanuvchilar ro‘yxati yuklanmoqda... ✦</div>';

    try {
      const res = await API.getSuperCoordinators();
      const coords = res.coordinators || [];

      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="font-size: 20px;">Foydalanuvchilar & Koordinatorlar Boshqaruvi</h3>
            <p style="color: #94a3b8; font-size: 13px;">Admin qo‘shish, login va parollarni almashtirish, bloklash yoki faollashtirish.</p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.AdminController.openCreateCoordinatorModal()">
            + Admin / Koordinator Qo‘shish ✦
          </button>
        </div>

        <div class="glass table-responsive" style="border-radius: 16px;">
          <table class="custom-table">
            <thead>
              <tr>
                <th>F.I.SH</th>
                <th>Login / Email</th>
                <th>Vazifasi & Yo‘nalish</th>
                <th>Holat</th>
                <th>Oxirgi Faollik</th>
                <th>Amallar (Bloklash / Tahrirlash)</th>
              </tr>
            </thead>
            <tbody>
              ${coords.map(c => `
                <tr>
                  <td><strong>${c.full_name}</strong></td>
                  <td><code style="color: var(--gold-light);">${c.username}</code></td>
                  <td>
                    <span class="text-gold" style="font-weight: 600;">
                      ${c.role === 'super_admin' ? '👑 Asosiy Super Admin' : (c.category_name || 'Koordinator')}
                    </span>
                  </td>
                  <td>
                    <span class="badge ${c.is_active ? 'badge-approved' : 'badge-rejected'}">
                      ${c.is_active ? 'FAOL' : 'BLOKLANGAN'}
                    </span>
                  </td>
                  <td><span style="font-size: 12px; color: #94a3b8;">${(c.last_login || 'Kirilmagan').substring(0, 16)}</span></td>
                  <td>
                    ${c.username === 'azizbekxabibullayev419@gmail.com' ? (
                      c.id === this.currentUser.id 
                        ? '<span style="color: var(--gold-light); font-size: 11px; font-weight: 800;">👑 Siz (Katta Asosiy Admin)</span>'
                        : '<span class="badge" style="background: rgba(232,189,104,0.22); color: var(--gold-light); border: 1px solid var(--gold-primary); font-size: 11px; font-weight: 800; padding: 6px 10px;">👑 DAXSLSIZ (Katta Asosiy Admin)</span>'
                    ) : (
                      c.id !== this.currentUser.id ? `
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                          <button class="btn btn-secondary btn-sm" onclick="window.AdminController.openChangeNameModal(${c.id}, '${c.full_name.replace(/'/g, "\\'")}')">
                            👤 Ism
                          </button>
                          <button class="btn ${c.is_active ? 'btn-outline' : 'btn-primary'} btn-sm" onclick="window.AdminController.toggleCoordinatorActive(${c.id}, ${c.is_active ? 0 : 1})">
                            ${c.is_active ? '🚫 Bloklash' : '✅ Faol qilish'}
                          </button>
                          <button class="btn btn-secondary btn-sm" onclick="window.AdminController.openChangeLoginModal(${c.id}, '${c.username}')">
                            ✏️ Login
                          </button>
                          <button class="btn btn-secondary btn-sm" onclick="window.AdminController.openResetPasswordModal(${c.id}, '${c.username}')">
                            🔑 Parol
                          </button>
                          <button class="btn btn-sm" style="background: rgba(239,68,68,0.18); border: 1px solid #ef4444; color: #f87171;" onclick="window.AdminController.deleteCoordinatorAction(${c.id}, '${c.username}')">
                            🗑️ Olib tashlash
                          </button>
                        </div>
                      ` : '<span style="color: var(--gold-light); font-size: 11px; font-weight: 700;">(Joriy hisob)</span>'
                    )}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div style="color: var(--danger); text-align: center; padding: 30px;">Xatolik: ${e.message}</div>`;
    }
  },

  async openCreateCoordinatorModal() {
    const modal = document.getElementById('super-create-modal');
    const select = document.getElementById('coord-category');
    if (select) {
      try {
        const res = await API.getCategories();
        if (res && res.categories) {
          select.innerHTML = res.categories.map(c => 
            `<option value="${c.id}">${c.icon} ${c.name}</option>`
          ).join('');
        }
      } catch (e) {}
    }
    if (modal) modal.classList.add('active');
  },

  async submitNewCoordinator() {
    const full_name = document.getElementById('coord-name').value.trim();
    const username = document.getElementById('coord-user').value.trim();
    const password = document.getElementById('coord-pass').value.trim();
    const role = document.getElementById('coord-role').value;
    const category_id = parseInt(document.getElementById('coord-category').value, 10);

    try {
      await API.createCoordinator({ full_name, username, password, role, category_id });
      document.getElementById('super-create-modal').classList.remove('active');
      alert(`✅ Yangi ${role === 'super_admin' ? 'Super Admin' : 'Koordinator'} muvaffaqiyatli yaratildi: ${username}`);
      this.renderCoordinatorsTab(document.getElementById('admin-tab-content'));
    } catch (err) {
      alert("Xatolik: " + err.message);
    }
  },

  async toggleCoordinatorActive(id, newStatus) {
    const actionText = newStatus ? "faollashtirishni" : "bloklashni";
    if (!confirm(`Haqiqatan ham ushbu foydalanuvchini ${actionText} tasdiqlaysizmi?`)) return;
    try {
      await API.updateCoordinator(id, { is_active: newStatus });
      alert(`✅ Foydalanuvchi muvaffaqiyatli ${newStatus ? 'faollashtirildi' : 'bloklandi'}!`);
      this.renderCoordinatorsTab(document.getElementById('admin-tab-content'));
    } catch (e) {
      alert("Xatolik: " + e.message);
    }
  },

  openChangeLoginModal(id, currentUsername) {
    const newUsername = prompt(`Foydalanuvchi (${currentUsername}) uchun yangi login yoki emailni kiriting:`, currentUsername);
    if (!newUsername || newUsername.trim() === currentUsername) return;

    if (!confirm(`Yangi loginni [${newUsername.trim()}] ga o‘zgartirishni tasdiqlaysizmi?`)) return;

    API.updateCoordinator(id, { username: newUsername.trim() }).then(() => {
      alert(`✅ Login muvaffaqiyatli o‘zgartirildi: ${newUsername.trim()}`);
      this.renderCoordinatorsTab(document.getElementById('admin-tab-content'));
    }).catch(err => {
      alert("Xatolik: " + err.message);
    });
  },

  openChangeNameModal(id, currentName) {
    const newName = prompt(`Admin/Koordinator uchun yangi F.I.SH (ism-familiya) kiriting:`, currentName);
    if (!newName || !newName.trim() || newName.trim() === currentName) return;

    if (!confirm(`F.I.SH ni "${newName.trim()}" ga o‘zgartirishni tasdiqlaysizmi?`)) return;

    API.updateCoordinator(id, { full_name: newName.trim() }).then(() => {
      alert(`✅ F.I.SH muvaffaqiyatli o‘zgartirildi: ${newName.trim()}`);
      this.renderCoordinatorsTab(document.getElementById('admin-tab-content'));
    }).catch(err => {
      alert("Xatolik: " + err.message);
    });
  },

  async openEditStudentNameModal(studentId, currentFirstName, currentLastName, ideaId) {
    const newFirst = prompt("O‘quvchining ismi:", currentFirstName);
    if (!newFirst || !newFirst.trim()) return;
    const newLast = prompt("O‘quvchining familiyasi:", currentLastName);
    if (!newLast || !newLast.trim()) return;

    if (!confirm(`O‘quvchi ismini "${newFirst.trim()} ${newLast.trim()}" ga o‘zgartirishni tasdiqlaysizmi?`)) return;

    try {
      await API.updateStudentInfo(studentId, { first_name: newFirst.trim(), last_name: newLast.trim() });
      alert("✅ O‘quvchi ismi muvaffaqiyatli o‘zgartirildi!");
      this.openIdeaDetailModal(ideaId);
      this.filterIdeasTable();
    } catch (e) {
      alert("Xatolik: " + e.message);
    }
  },

  openResetPasswordModal(id, username) {
    const newPwd = prompt(`@${username} uchun yangi parolni kiriting:`);
    if (!newPwd) return;
    if (newPwd.length < 6) {
      alert("Parol kamida 6 belgidan iborat bo'lishi kerak!");
      return;
    }

    if (!confirm(`Ushbu foydalanuvchi parolini yangilashni tasdiqlaysizmi?`)) return;

    API.updateCoordinator(id, { password: newPwd }).then(() => {
      alert(`✅ @${username} paroli muvaffaqiyatli yangilandi!`);
    }).catch(err => {
      alert("Xatolik: " + err.message);
    });
  },

  async deleteCoordinatorAction(id, username) {
    if (!confirm(`⚠️ DIQQAT! Haqiqatan ham @${username} hisobini tizimdan BUTUNLAY OLIB TASHLASHNI tasdiqlaysizmi?\n\nUshbu amalni ortga qaytarib bo'lmaydi!`)) {
      return;
    }

    try {
      const res = await API.deleteCoordinator(id);
      alert("✅ " + (res.message || "Admin muvaffaqiyatli olib tashlandi!"));
      this.renderCoordinatorsTab(document.getElementById('admin-tab-content'));
    } catch (e) {
      alert("Xatolik: " + e.message);
    }
  },

  // 4. Statistics Overview
  async renderStatsTab(container) {
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--gold-light);">Statistika yuklanmoqda... ✦</div>';

    try {
      const res = await API.getSuperStats();
      const stats = res.categories_stats || [];

      container.innerHTML = `
        <h3 style="font-size: 20px; margin-bottom: 20px;">8 Yo‘nalish Bo‘yicha Umumiy Taqsimot</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
          ${stats.map(s => `
            <div class="glass" style="padding: 20px; border-left: 4px solid ${s.color}; border-radius: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h4 style="font-size: 17px;">${s.icon} ${s.name}</h4>
                <span class="badge badge-pending" style="font-size: 12px;">${s.total_ideas} ta</span>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; text-align: center; font-size: 11px;">
                <div style="background: rgba(245,158,11,0.1); padding: 8px; border-radius: 8px;">
                  <div style="font-weight: 800; color: #fbbf24; font-size: 15px;">${s.pending_ideas || 0}</div>
                  <div style="color: #94a3b8;">Ko'rib chiqilmoqda</div>
                </div>
                <div style="background: rgba(16,185,129,0.1); padding: 8px; border-radius: 8px;">
                  <div style="font-weight: 800; color: #34d399; font-size: 15px;">${s.approved_ideas || 0}</div>
                  <div style="color: #94a3b8;">Ma'qullandi</div>
                </div>
                <div style="background: rgba(239,68,68,0.1); padding: 8px; border-radius: 8px;">
                  <div style="font-weight: 800; color: #f87171; font-size: 15px;">${s.rejected_ideas || 0}</div>
                  <div style="color: #94a3b8;">Rad etildi</div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div style="color: var(--danger); text-align: center; padding: 30px;">Xatolik: ${e.message}</div>`;
    }
  },

  // 5. Activity Logs Tab
  async renderLogsTab(container) {
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--gold-light);">Jurnal yuklanmoqda... ✦</div>';

    try {
      const res = await API.getActivityLogs();
      const logs = res.logs || [];

      container.innerHTML = `
        <h3 style="font-size: 20px; margin-bottom: 20px;">Tizim Xavfsizlik Jurnali (Audit Trail)</h3>
        <div class="glass table-responsive" style="border-radius: 16px;">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Vaqt</th>
                <th>Foydalanuvchi</th>
                <th>Amal</th>
                <th>Tafsilot</th>
                <th>IP Manzil</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map(l => `
                <tr>
                  <td><span style="font-size: 11px; color: #94a3b8;">${(l.created_at || '').substring(0, 19)}</span></td>
                  <td><strong>${l.username ? `@${l.username}` : 'Tizim (O‘quvchi)'}</strong></td>
                  <td><span class="badge badge-pending">${l.action}</span></td>
                  <td><div style="max-width: 320px;">${l.details}</div></td>
                  <td><code style="font-size: 11px; color: #64748b;">${l.ip_address}</code></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div style="color: var(--danger); text-align: center; padding: 30px;">Xatolik: ${e.message}</div>`;
    }
  }
};

window.AdminController = AdminController;
