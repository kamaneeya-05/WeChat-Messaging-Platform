import { createSlice } from '@reduxjs/toolkit';

// 1. Check localStorage the moment the file is loaded
const storedUser = localStorage.getItem('user');
const storedToken = localStorage.getItem('token');

const normalizeUser = (user) => {
  if (!user) return null;
  return {
    ...user,
    _id: user._id || user.id,
  };
};

// 2. Set the initial state based on what we found in localStorage
const initialState = {
  user: storedUser ? normalizeUser(JSON.parse(storedUser)) : null,
  token: storedToken ? storedToken : null,
  isAuthenticated: !!storedToken, // Evaluates to true if a token exists
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const normalizedUser = normalizeUser(action.payload.user);

      // Update Redux state
      state.user = normalizedUser;
      state.token = action.payload.token;
      state.isAuthenticated = true;

      // 3. Save to localStorage so it survives a refresh
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      localStorage.setItem('token', action.payload.token);
    },
    logout: (state) => {
      // Clear Redux state
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;

      // 4. Remove from localStorage when they explicitly log out
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    },
    updateUser: (state, action) => {
      if (!state.user) return;

      state.user = {
        ...state.user,
        ...action.payload,
      };
      localStorage.setItem('user', JSON.stringify(state.user));
    },
  },
});

export const { setCredentials, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;
