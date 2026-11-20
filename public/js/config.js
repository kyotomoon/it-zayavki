/*
 * Адрес API (json-server).
 * Пусто — сайт сам найдёт сервер: локальный (http://127.0.0.1:3000) или на том же сайте (Render).
 * На Netlify своего сервера нет, поэтому данные берутся с json-server на Render.
 */
const API_URL = location.hostname.endsWith('netlify.app') ? 'https://it-zayavki.onrender.com/api' : '';
