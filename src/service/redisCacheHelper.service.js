import { redisClient } from "./redisClient.service.js";

export async function cacheSheet(sheetId, sheetData) {
  const key = `sheet:${sheetId}`;
  await redisClient.set(key, JSON.stringify(sheetData), "EX", 300);
}

export async function getCachedSheet(sheetId) {
  const key = `sheet:${sheetId}`;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

export async function invalidateSheetCache(sheetId) {
  const key = `sheet:${sheetId}`;
  await redisClient.del(key);
}

export async function cacheCells(sheetId, cellsData) {
  const key = `cells:${sheetId}`;
  await redisClient.set(key, JSON.stringify(cellsData), "EX", 300);
}

export async function getCachedCells(sheetId) {
  const key = `cells:${sheetId}`;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

export async function invalidateCellsCache(sheetId) {
  const key = `cells:${sheetId}`;
  await redisClient.del(key);
}

// export async function cacheWorkbooks(orgId, userId, data) {
//   const key = `workbooks:${orgId}:${userId}`;
//   await redisClient.set(key, JSON.stringify(data), "EX", 300); // cache for 5 min
// }

// export async function getCachedWorkbooks(orgId, userId) {
//   const key = `workbooks:${orgId}:${userId}`;
//   const data = await redisClient.get(key);
//   return data ? JSON.parse(data) : null;
// }

// export async function invalidateWorkbooksCache(orgId, userId) {
//   const key = `workbooks:${orgId}:${userId}`;
//   await redisClient.del(key);
// }