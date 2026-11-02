/**
 * G'oyalar Banki - API Client
 */

const API = {
  getToken() {
    return localStorage.getItem('gb_admin_token') || '';
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('gb_admin_token', token);
    } else {
      localStorage.removeItem('gb_admin_token');
    }
  },

  async request(endpoint, options = {}) {
    const headers = options.headers || {};
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers
      });

      const text = await response.text();
      let data = {};
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { error: text || `Server xatosi (${response.status})` };
      }

      if (!response.ok) {
        throw new Error(data.error || `Xatolik yuz berdi (${response.status})`);
      }
      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  },

  // Public APIs
  async getCategories() {
    return this.request('/api/categories');
  },

  async getStats() {
    return this.request('/api/stats');
  },

  async getPublicIdeas(category = '', search = '') {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    return this.request(`/api/ideas/public?${params.toString()}`);
  },

  async trackIdea(code) {
    return this.request(`/api/ideas/track/${encodeURIComponent(code)}`);
  },

  async submitIdea(data) {
    return this.request('/api/ideas/submit', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async likeIdea(id) {
    return this.request(`/api/ideas/${id}/like`, {
      method: 'POST'
    });
  },

  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request('/api/upload', {
      method: 'POST',
      body: formData
    });
  },

  // Cefrbek AI
  async cefrbekWelcome() {
    return this.request('/api/cefrbek/welcome');
  },

  async cefrbekChat(message, history = []) {
    return this.request('/api/cefrbek/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history })
    });
  },

  // Aliases for backward compatibility
  async seferbekWelcome() {
    return this.cefrbekWelcome();
  },

  async seferbekChat(message, history = []) {
    return this.cefrbekChat(message, history);
  },

  // Admin Auth
  async adminLogin(username, password) {
    const res = await this.request('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  },

  async adminLogout() {
    try {
      await this.request('/api/admin/logout', { method: 'POST' });
    } catch (e) {}
    this.setToken(null);
  },

  async getAdminMe() {
    return this.request('/api/admin/me');
  },

  async updateProfile(username, full_name = '') {
    return this.request('/api/admin/profile', {
      method: 'PATCH',
      body: JSON.stringify({ username, full_name })
    });
  },

  async changePassword(current_password, new_password) {
    return this.request('/api/admin/change-password', {
      method: 'PATCH',
      body: JSON.stringify({ current_password, new_password })
    });
  },

  // Coordinator & Super Admin Ideas (Strict RBAC)
  async getAdminIdeas(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request(`/api/admin/ideas?${q}`);
  },

  async getAdminIdeaDetail(id) {
    return this.request(`/api/admin/ideas/${id}`);
  },

  async updateIdeaStatus(id, status, comment = '') {
    return this.request(`/api/admin/ideas/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, comment })
    });
  },

  async deleteIdea(id) {
    try {
      return await this.request(`/api/admin/ideas/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      // Fallback via POST in case DELETE is blocked
      return await this.request(`/api/admin/ideas/${id}/delete`, {
        method: 'POST'
      });
    }
  },

  async addIdeaComment(id, comment) {
    return this.request(`/api/admin/ideas/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment })
    });
  },

  async updateStudentInfo(id, data) {
    return this.request(`/api/admin/students/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  getExcelExportUrl(params = {}) {
    const token = this.getToken();
    const q = new URLSearchParams(params);
    return `/api/admin/export/excel?${q.toString()}`;
  },

  // Super Admin Exclusive
  async getSuperCoordinators() {
    return this.request('/api/super/coordinators');
  },

  async createCoordinator(data) {
    return this.request('/api/super/coordinators', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateCoordinator(id, data) {
    return this.request(`/api/super/coordinators/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async deleteCoordinator(id) {
    try {
      return await this.request(`/api/super/coordinators/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      // Fallback via POST in case DELETE is blocked
      return await this.request(`/api/super/coordinators/${id}/delete`, {
        method: 'POST'
      });
    }
  },

  async getActivityLogs() {
    return this.request('/api/super/logs');
  },

  async getSuperStats() {
    return this.request('/api/super/stats');
  }
};

window.API = API;
