
import { MCQ, ExamType, Subject } from "./types";

const DB_NAME = "SEK_Offline_Bank";
const STORE_NAME = "mcqs";
const VERSION = 1;

export class MCQDatabase {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("examType", "examType", { unique: false });
          store.createIndex("subject", "subject", { unique: false });
          store.createIndex("exam_subject", ["examType", "subject"], { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = () => reject("Failed to open IndexedDB");
    });
  }

  async saveBatch(mcqs: MCQ[], examType: ExamType): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      mcqs.forEach((m) => {
        store.put({ ...m, examType }); // Enrich with examType for indexing
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject();
    });
  }

  async getBatch(examType: ExamType, subjects: Subject[], count: number): Promise<MCQ[]> {
    if (!this.db) await this.init();
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("examType");
      const request = index.getAll(examType);

      request.onsuccess = () => {
        const all = request.result as (MCQ & { examType: string })[];
        // Filter by subjects and pick random
        const filtered = all.filter(m => subjects.includes(m.subject));
        const shuffled = filtered.sort(() => 0.5 - Math.random());
        resolve(shuffled.slice(0, count));
      };
    });
  }

  async getCount(): Promise<number> {
    if (!this.db) await this.init();
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
    });
  }
}

export const dbManager = new MCQDatabase();
