/** 이 브라우저에 저장된 앱 데이터(작업 자동 저장·내 템플릿·내 스티커·설정·캡션·캐시)를 모두 지운다. 서버에는 저장된 것이 없다. */
export async function clearAllLocalData(): Promise<void> {
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith("card-news-")) localStorage.removeItem(key);
  } catch {
    // 저장소 접근이 막힌 환경: 무시
  }
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase("card-news-maker");
    request.onsuccess = request.onerror = request.onblocked = () => resolve();
  });
  if ("caches" in window) {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith("card-news-")).map((name) => caches.delete(name)));
  }
}

/** 브라우저가 알려 주는 저장소 사용량(근사값). 지원하지 않으면 null. */
export async function estimateStorageUsage(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota };
}
