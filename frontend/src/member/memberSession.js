const KEY='fixflow.session.v1';
export function readSession(){try{return JSON.parse(sessionStorage.getItem(KEY))?.token||null;}catch{return null;}}
export function saveSession(token){try{token?sessionStorage.setItem(KEY,JSON.stringify({token})):sessionStorage.removeItem(KEY);}catch{/* Allow the current in-memory session when storage is unavailable. */}}
