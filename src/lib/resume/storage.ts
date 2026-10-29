import { resumeSchema, type Resume } from "./model";
export const resumeDatabase = "sayq-private-resumes";
function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(resumeDatabase, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("versions", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(new Error("浏览器私密存储不可用，请检查浏览器设置。"));
  });
}
async function transaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction("versions", mode);
      const req = run(tx.objectStore("versions"));
      let result: T;
      req.onsuccess = () => {
        result = req.result;
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () =>
        reject(new Error("简历保存失败，浏览器空间可能不足。"));
      tx.onabort = () => reject(new Error("简历存储操作未完成。"));
    });
  } finally {
    db.close();
  }
}
export async function loadResumes() {
  const values = await transaction("readonly", (store) => store.getAll());
  return values
    .map((v) => resumeSchema.parse(v))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function putResume(resume: Resume) {
  await transaction("readwrite", (store) =>
    store.put(resumeSchema.parse(resume)),
  );
}
export async function deleteResume(id: string) {
  await transaction("readwrite", (store) => store.delete(id));
}
export async function clearResumes() {
  await transaction("readwrite", (store) => store.clear());
}
