import type { AppDocument } from '../document/types';

const DB_NAME = 'imagetuning';
const DB_VERSION = 1;
const STORE_NAME = 'autosave';
const LATEST_KEY = 'latest';

export type AutosaveSnapshot = {
  document: AppDocument;
  filename: string;
  savedAt: string;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('このブラウザでは自動保存を利用できません。'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('自動保存を開けませんでした。'));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('自動保存の処理に失敗しました。'));
  });
}

export async function saveAutosave(snapshot: AutosaveSnapshot): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    await requestToPromise(transaction.objectStore(STORE_NAME).put(snapshot, LATEST_KEY));
  } finally {
    database.close();
  }
}

export async function loadAutosave(): Promise<AutosaveSnapshot | null> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    return (await requestToPromise(transaction.objectStore(STORE_NAME).get(LATEST_KEY))) as AutosaveSnapshot | null;
  } finally {
    database.close();
  }
}

export async function clearAutosave(): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    await requestToPromise(transaction.objectStore(STORE_NAME).delete(LATEST_KEY));
  } finally {
    database.close();
  }
}

export function hasMeaningfulContent(document: AppDocument): boolean {
  return document.images.length > 0 || document.shapes.length > 0 || document.comments.length > 0;
}
