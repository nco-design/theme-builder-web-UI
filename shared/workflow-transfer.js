(function () {
  "use strict";

  const databaseName = "spruce-theme-builder-workflow";
  const storeName = "handoffs";
  const maximumAge = 30 * 60 * 1000;

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.addEventListener("upgradeneeded", () => {
        request.result.createObjectStore(storeName, { keyPath: "type" });
      });
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(new Error("Temporary browser storage is unavailable.")));
    });
  }

  async function runTransaction(mode, callback) {
    const database = await openDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        let result;

        try {
          result = callback(store);
        } catch (error) {
          reject(error);
          return;
        }

        transaction.addEventListener("complete", () => resolve(result));
        transaction.addEventListener("error", () => reject(transaction.error || new Error("Temporary browser storage failed.")));
        transaction.addEventListener("abort", () => reject(transaction.error || new Error("Temporary browser storage was cancelled.")));
      });
    } finally {
      database.close();
    }
  }

  async function handOff(type, payload) {
    if (typeof type !== "string" || !type) throw new Error("A workflow handoff type is required.");
    await runTransaction("readwrite", (store) => {
      store.put({ type, payload, createdAt: Date.now() });
    });
  }

  async function receive(type) {
    if (typeof type !== "string" || !type) return null;

    const database = await openDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.get(type);

        request.addEventListener("success", () => {
          const record = request.result;
          if (record) store.delete(type);
          transaction.addEventListener("complete", () => {
            if (!record || Date.now() - record.createdAt > maximumAge) {
              resolve(null);
              return;
            }
            resolve(record.payload);
          });
        });
        request.addEventListener("error", () => reject(new Error("Unable to retrieve the temporary workflow data.")));
        transaction.addEventListener("error", () => reject(transaction.error || new Error("Temporary browser storage failed.")));
      });
    } finally {
      database.close();
    }
  }

  window.ThemeBuilderWorkflow = { handOff, receive };
}());
