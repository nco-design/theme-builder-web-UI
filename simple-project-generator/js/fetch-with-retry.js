window.SimpleProjectGenerator.fetchWithRetry = async function fetchWithRetry(url, options = {}) {
  const timeoutMs = 5000;
  const retryCount = 2;
  let lastError;

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
      lastError = timedOut
        ? new Error(`Timed out after ${timeoutMs / 1000} seconds.`)
        : error;

      if (attempt === retryCount) break;

      await new Promise((resolve) => {
        window.setTimeout(resolve, 250 * (attempt + 1));
      });
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  throw new Error(
    `Unable to fetch ${url} after ${retryCount + 1} attempts: ${lastError.message}`
  );
};
