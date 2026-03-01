import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';

const api = axios.create({ baseURL: BASE_URL });

export const getCurve = (date) =>
  api.get('/curve', { params: date ? { date } : {} });

export const getCurveRange = (start, end, maturity) =>
  api.get('/curve/range', { params: { start, end, maturity } });

export const getEvents = (indicator) =>
  api.get('/events', { params: indicator ? { indicator } : {} });

export const getEventImpact = (indicator, date, window = 5) =>
  api.get('/event-impact', { params: { indicator, date, window } });

export const getFedFunds = (start, end) =>
  api.get('/fed-funds', { params: { start, end } });