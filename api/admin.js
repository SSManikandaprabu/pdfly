const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const STATE_FILE = path.join(os.tmpdir(), 'pdfly-cloud-state.json');
const KV_KEY = 'pdfly_cloud_state_v1';

function sha256(str) {
  return crypto.createHash('sha256').update(String(str || ''), 'utf8').digest('hex');
}

function getDefaultConfig() {
  return {
    announcement: {
      enabled: false,
      badge: 'NEW',
      text: '100% Free & Local PDF Tools — Zero Server Uploads!',
      linkText: '',
      linkUrl: ''
    },
    defaultTheme: 'dark',
    defaultLang: 'en',
    toolOverrides: {},
    presetOverrides: {},
    updatedAt: new Date().toISOString()
  };
}

function getDefaultStats() {
  return {
    totalOperations: 0,
    totalBytesProcessed: 0,
    totalBytesSaved: 0,
    pageViews: 0,
    toolUsage: {},
    recentEvents: []
  };
}

function getDefaultState() {
  return {
    passcodeHash: sha256(process.env.ADMIN_PASSCODE || 'admin123'),
    config: getDefaultConfig(),
    stats: getDefaultStats(),
    kvConfig: {
      url: '',
      token: ''
    }
  };
}

function cloneState(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function normalizeState(raw) {
  const def = getDefaultState();
  const s = raw && typeof raw === 'object' ? raw : {};
  const cfg = s.config && typeof s.config === 'object' ? s.config : {};
  const st = s.stats && typeof s.stats === 'object' ? s.stats : {};
  const ann = cfg.announcement && typeof cfg.announcement === 'object' ? cfg.announcement : {};
  const kv = s.kvConfig && typeof s.kvConfig === 'object' ? s.kvConfig : {};

  return {
    passcodeHash: typeof s.passcodeHash === 'string' && s.passcodeHash.length === 64 ? s.passcodeHash : def.passcodeHash,
    config: {
      announcement: {
        enabled: Boolean(ann.enabled),
        badge: typeof ann.badge === 'string' ? ann.badge : def.config.announcement.badge,
        text: typeof ann.text === 'string' ? ann.text : def.config.announcement.text,
        linkText: typeof ann.linkText === 'string' ? ann.linkText : '',
        linkUrl: typeof ann.linkUrl === 'string' ? ann.linkUrl : ''
      },
      defaultTheme: cfg.defaultTheme === 'light' ? 'light' : 'dark',
      defaultLang: ['en', 'hi', 'ta'].includes(cfg.defaultLang) ? cfg.defaultLang : 'en',
      toolOverrides: cfg.toolOverrides && typeof cfg.toolOverrides === 'object' ? cfg.toolOverrides : {},
      presetOverrides: cfg.presetOverrides && typeof cfg.presetOverrides === 'object' ? cfg.presetOverrides : {},
      updatedAt: typeof cfg.updatedAt === 'string' ? cfg.updatedAt : new Date().toISOString()
    },
    stats: {
      totalOperations: Number(st.totalOperations) || 0,
      totalBytesProcessed: Number(st.totalBytesProcessed) || 0,
      totalBytesSaved: Number(st.totalBytesSaved) || 0,
      pageViews: Number(st.pageViews) || 0,
      toolUsage: st.toolUsage && typeof st.toolUsage === 'object' ? st.toolUsage : {},
      recentEvents: Array.isArray(st.recentEvents) ? st.recentEvents.slice(0, 50) : []
    },
    kvConfig: {
      url: typeof kv.url === 'string' ? kv.url.trim().replace(/\/+$/, '') : '',
      token: typeof kv.token === 'string' ? kv.token.trim() : ''
    }
  };
}

function getEffectiveKvCredentials(state) {
  const envUrl = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').trim().replace(/\/+$/, '');
  const envToken = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
  if (envUrl && envToken) {
    return { url: envUrl, token: envToken, source: 'env' };
  }
  if (state && state.kvConfig && state.kvConfig.url && state.kvConfig.token) {
    return { url: state.kvConfig.url, token: state.kvConfig.token, source: 'runtime' };
  }
  return null;
}

async function kvGet(kv) {
  if (!kv) return null;
  try {
    const resp = await fetch(`${kv.url}/get/${encodeURIComponent(KV_KEY)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${kv.token}` }
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data && typeof data.result === 'string' && data.result.length > 0) {
      return normalizeState(JSON.parse(data.result));
    }
  } catch (e) {
    // Fallback to local/memory state on transient KV failure
  }
  return null;
}

async function kvSet(kv, state) {
  if (!kv) return false;
  try {
    const resp = await fetch(kv.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${kv.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(['SET', KV_KEY, JSON.stringify(state)])
    });
    return resp.ok;
  } catch (e) {
    return false;
  }
}

async function loadState() {
  let state = null;
  if (global.__PDFLY_CLOUD_STATE) {
    state = normalizeState(global.__PDFLY_CLOUD_STATE);
  } else {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, 'utf8');
        state = normalizeState(JSON.parse(raw));
      }
    } catch (e) {
      state = null;
    }
  }

  if (!state) {
    state = getDefaultState();
  }

  const kv = getEffectiveKvCredentials(state);
  if (kv) {
    const remoteState = await kvGet(kv);
    if (remoteState) {
      remoteState.kvConfig = state.kvConfig;
      state = remoteState;
    }
  }

  global.__PDFLY_CLOUD_STATE = cloneState(state);
  return state;
}

async function saveState(state) {
  const normalized = normalizeState(state);
  global.__PDFLY_CLOUD_STATE = cloneState(normalized);

  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(normalized), 'utf8');
  } catch (e) {
    // Ignore read-only disk environments; in-memory global still persists warm instance state
  }

  const kv = getEffectiveKvCredentials(normalized);
  let kvSynced = false;
  if (kv) {
    kvSynced = await kvSet(kv, normalized);
  }

  return {
    state: normalized,
    storageMode: kv && kvSynced ? 'vercel-kv' : 'serverless-memory',
    kvConfigured: Boolean(kv)
  };
}

function getStorageStatus(state) {
  const kv = getEffectiveKvCredentials(state);
  return {
    storageMode: kv ? 'vercel-kv' : 'serverless-memory',
    kvConfigured: Boolean(kv)
  };
}

function getQuery(req) {
  const urlObj = new URL(req.url || '/', 'http://localhost');
  const query = {};
  urlObj.searchParams.forEach((v, k) => {
    query[k] = v;
  });
  if (req.query && typeof req.query === 'object') {
    Object.assign(query, req.query);
  }
  return query;
}

async function parseJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    return JSON.parse(req.body);
  }
  if (typeof req.on !== 'function') {
    return {};
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) raw = raw.slice(0, 1e6);
    });
    req.on('end', () => {
      try {
        resolve(raw.trim() ? JSON.parse(raw) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function sendJson(res, statusCode, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(payload);
  }
  res.statusCode = statusCode;
  res.end(JSON.stringify(payload));
}

function verifyPasscode(inputPasscode, state) {
  const candidateHash = sha256(String(inputPasscode || ''));
  if (candidateHash === state.passcodeHash) return true;
  if (process.env.ADMIN_PASSCODE && candidateHash === sha256(process.env.ADMIN_PASSCODE)) return true;
  return false;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (typeof res.status === 'function') return res.status(204).end();
    res.statusCode = 204;
    return res.end();
  }

  try {
    const state = await loadState();
    const query = getQuery(req);

    if (req.method === 'GET') {
      const action = query.action || 'public';

      if (action === 'public') {
        let storageMeta = getStorageStatus(state);
        if (query.trackView === '1') {
          state.stats.pageViews = (Number(state.stats.pageViews) || 0) + 1;
          const saved = await saveState(state);
          storageMeta = { storageMode: saved.storageMode, kvConfigured: saved.kvConfigured };
        }
        return sendJson(res, 200, {
          ok: true,
          config: state.config,
          summary: {
            totalOperations: state.stats.totalOperations,
            totalBytesSaved: state.stats.totalBytesSaved,
            pageViews: state.stats.pageViews
          },
          storageMode: storageMeta.storageMode
        });
      }

      if (action === 'track') {
        const toolId = String(query.tool || 'unknown').slice(0, 64);
        const bytes = Math.max(0, Number(query.bytes) || 0);
        const savedBytes = Math.max(0, Number(query.saved) || 0);
        const lang = ['en', 'hi', 'ta'].includes(query.lang) ? query.lang : 'en';

        state.stats.totalOperations = (Number(state.stats.totalOperations) || 0) + 1;
        state.stats.totalBytesProcessed = (Number(state.stats.totalBytesProcessed) || 0) + bytes;
        state.stats.totalBytesSaved = (Number(state.stats.totalBytesSaved) || 0) + savedBytes;
        state.stats.toolUsage[toolId] = (Number(state.stats.toolUsage[toolId]) || 0) + 1;
        state.stats.recentEvents.unshift({
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toISOString(),
          toolId,
          bytes,
          savedBytes,
          lang
        });
        if (state.stats.recentEvents.length > 50) {
          state.stats.recentEvents = state.stats.recentEvents.slice(0, 50);
        }

        await saveState(state);
        return sendJson(res, 200, { ok: true });
      }

      return sendJson(res, 400, { ok: false, error: 'Unsupported GET action' });
    }

    if (req.method === 'POST') {
      const body = await parseJsonBody(req);
      const action = body.action || 'dashboard';

      if (!verifyPasscode(body.passcode, state)) {
        return sendJson(res, 401, { ok: false, error: 'Invalid admin passcode' });
      }

      if (action === 'login' || action === 'dashboard') {
        const storageMeta = getStorageStatus(state);
        return sendJson(res, 200, {
          ok: true,
          config: state.config,
          stats: state.stats,
          storageMode: storageMeta.storageMode,
          kvConfigured: storageMeta.kvConfigured
        });
      }

      if (action === 'saveConfig') {
        const incoming = body.config && typeof body.config === 'object' ? body.config : {};
        const merged = {
          ...state.config,
          ...incoming,
          announcement: {
            ...state.config.announcement,
            ...(incoming.announcement && typeof incoming.announcement === 'object' ? incoming.announcement : {})
          },
          toolOverrides:
            incoming.toolOverrides && typeof incoming.toolOverrides === 'object'
              ? incoming.toolOverrides
              : state.config.toolOverrides,
          presetOverrides:
            incoming.presetOverrides && typeof incoming.presetOverrides === 'object'
              ? incoming.presetOverrides
              : state.config.presetOverrides,
          updatedAt: new Date().toISOString()
        };
        state.config = normalizeState({ config: merged }).config;
        const saved = await saveState(state);
        return sendJson(res, 200, {
          ok: true,
          config: saved.state.config,
          stats: saved.state.stats,
          storageMode: saved.storageMode,
          kvConfigured: saved.kvConfigured
        });
      }

      if (action === 'resetStats') {
        state.stats = getDefaultStats();
        const saved = await saveState(state);
        return sendJson(res, 200, {
          ok: true,
          config: saved.state.config,
          stats: saved.state.stats,
          storageMode: saved.storageMode,
          kvConfigured: saved.kvConfigured
        });
      }

      if (action === 'resetConfig') {
        state.config = getDefaultConfig();
        const saved = await saveState(state);
        return sendJson(res, 200, {
          ok: true,
          config: saved.state.config,
          stats: saved.state.stats,
          storageMode: saved.storageMode,
          kvConfigured: saved.kvConfigured
        });
      }

      if (action === 'changePasscode') {
        const newPasscode = String(body.newPasscode || '').trim();
        if (newPasscode.length < 4) {
          return sendJson(res, 400, { ok: false, error: 'New passcode must be at least 4 characters' });
        }
        state.passcodeHash = sha256(newPasscode);
        const saved = await saveState(state);
        return sendJson(res, 200, {
          ok: true,
          message: 'Passcode updated successfully',
          storageMode: saved.storageMode,
          kvConfigured: saved.kvConfigured
        });
      }

      if (action === 'configureKv') {
        const kvUrl = String(body.kvUrl || '').trim().replace(/\/+$/, '');
        const kvToken = String(body.kvToken || '').trim();

        if (!kvUrl && !kvToken) {
          state.kvConfig = { url: '', token: '' };
          const saved = await saveState(state);
          return sendJson(res, 200, {
            ok: true,
            config: saved.state.config,
            stats: saved.state.stats,
            storageMode: saved.storageMode,
            kvConfigured: saved.kvConfigured
          });
        }

        if (!kvUrl || !kvToken) {
          return sendJson(res, 400, { ok: false, error: 'Both Upstash/Vercel KV REST URL and Token are required' });
        }

        const testResp = await kvSet({ url: kvUrl, token: kvToken }, state);
        if (!testResp) {
          return sendJson(res, 400, { ok: false, error: 'Failed to connect to KV endpoint. Verify URL and REST token.' });
        }

        state.kvConfig = { url: kvUrl, token: kvToken };
        const saved = await saveState(state);
        return sendJson(res, 200, {
          ok: true,
          config: saved.state.config,
          stats: saved.state.stats,
          storageMode: saved.storageMode,
          kvConfigured: saved.kvConfigured
        });
      }

      return sendJson(res, 400, { ok: false, error: 'Unsupported POST action' });
    }

    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: err.message || 'Internal server error' });
  }
};
