import type { Chat } from "./types";

const DB_NAME = "aikit-news";
const STORE = "chats";
const VERSION = 1;

let _db: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function loadAllChats(): Promise<Chat[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).getAll();
      req.onsuccess = () =>
        resolve(
          (req.result as Chat[]).sort((a, b) => b.updatedAt - a.updatedAt)
        );
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function persistChat(chat: Chat): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(chat);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

export async function removeChat(id: string): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}
