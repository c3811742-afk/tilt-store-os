// localStorage can be missing or blocked (private mode, blocked site data); never let that break the app.
export const storage = {
  get: (key: string) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Unavailable: the value just isn't remembered.
    }
  },
};

// The same, for this browser tab only (sessionStorage): e.g. who is signed in here, while another tab is someone else.
export const tabStorage = {
  get: (key: string) => {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string) => {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      // Unavailable: the value just isn't remembered.
    }
  },
};
