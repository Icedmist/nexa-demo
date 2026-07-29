#!/usr/bin/env node
/**
 * ============================================================================
 * NEXASTORE OS / FIREBASE STORE MIGRATION UTILITY BUNDLE v2.0
 * ============================================================================
 * 
 * This standalone script allows you to easily export, backup, or directly migrate
 * store data between two Firebase Firestore instances (e.g., from an old project
 * to a new project or between different tenant databases).
 * 
 * Target Collections Migrated (Filtered by storeId):
 *  - stores
 *  - items
 *  - sales
 *  - movements
 *  - customers
 *  - users (staff profiles)
 *  - credits
 *  - debt_records
 *  - suppliers
 *  - categories
 *  - referrals
 *  - notifications
 *  - audit_logs
 *  - system_settings
 * 
 * ----------------------------------------------------------------------------
 * USAGE INSTRUCTIONS:
 * ----------------------------------------------------------------------------
 * 1. Install optional Firebase SDK if not already installed in your Node environment:
 *      npm install firebase
 * 
 * 2. EXPORT STORE DATA TO JSON BUNDLE:
 *      node firebase-store-migrator.mjs export \
 *        --storeId="store_abc123" \
 *        --sourceConfig='./source-firebase-config.json' \
 *        --output='./store_abc123_export.json'
 * 
 * 3. IMPORT JSON BUNDLE INTO TARGET FIREBASE:
 *      node firebase-store-migrator.mjs import \
 *        --targetConfig='./target-firebase-config.json' \
 *        --input='./store_abc123_export.json'
 * 
 * 4. DIRECT PROJECT-TO-PROJECT SYNC:
 *      node firebase-store-migrator.mjs sync \
 *        --storeId="store_abc123" \
 *        --sourceConfig='./source-firebase-config.json' \
 *        --targetConfig='./target-firebase-config.json'
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';

// All collections associated with a Store entity
const STORE_COLLECTIONS = [
  'items',
  'sales',
  'movements',
  'customers',
  'users',
  'credits',
  'debt_records',
  'suppliers',
  'categories',
  'referrals',
  'notifications',
  'audit_logs',
  'system_settings'
];

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const options = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const [key, val] = arg.slice(2).split('=');
      options[key] = val || args[++i] || true;
    }
  }

  return { command, options };
}

function loadFirebaseConfig(configPathOrJson) {
  if (!configPathOrJson) {
    throw new Error('Firebase config file path or JSON string is required.');
  }
  if (fs.existsSync(configPathOrJson)) {
    const raw = fs.readFileSync(path.resolve(configPathOrJson), 'utf8');
    return JSON.parse(raw);
  }
  try {
    return JSON.parse(configPathOrJson);
  } catch (e) {
    throw new Error(`Could not parse Firebase config file or string at: ${configPathOrJson}`);
  }
}

async function exportStoreData(db, storeId) {
  console.log(`\n📦 Starting export for Store ID: "${storeId}"...`);
  const exportPayload = {
    exportedAt: new Date().toISOString(),
    storeId,
    storeDoc: null,
    collections: {}
  };

  // 1. Fetch main Store document
  try {
    console.log(`  🔍 Fetching store metadata...`);
    const storeSnap = await getDoc(doc(db, 'stores', storeId));
    if (storeSnap.exists()) {
      exportPayload.storeDoc = { id: storeSnap.id, ...storeSnap.data() };
      console.log(`  ✅ Store metadata found: ${storeSnap.data().name || storeId}`);
    } else {
      console.warn(`  ⚠️ Store document "${storeId}" not found in 'stores' collection. Continuing with sub-collections.`);
    }
  } catch (e) {
    console.warn(`  ⚠️ Could not read store doc: ${e.message}`);
  }

  // 2. Query each sub-collection by storeId
  let totalDocsCount = 0;
  for (const colName of STORE_COLLECTIONS) {
    console.log(`  📂 Exporting collection: "${colName}"...`);
    exportPayload.collections[colName] = [];
    try {
      const q = query(collection(db, colName), where('storeId', '==', storeId));
      const snap = await getDocs(q);
      snap.forEach((docSnap) => {
        exportPayload.collections[colName].push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      const count = exportPayload.collections[colName].length;
      totalDocsCount += count;
      console.log(`     -> Extracted ${count} records from "${colName}"`);
    } catch (e) {
      console.error(`  ❌ Error exporting collection "${colName}": ${e.message}`);
    }
  }

  console.log(`\n🎉 Export complete! Total records bundled: ${totalDocsCount}`);
  return exportPayload;
}

async function importStoreData(targetDb, payload) {
  const { storeId, storeDoc, collections } = payload;
  console.log(`\n🚀 Starting import into target Firebase for Store ID: "${storeId}"...`);

  let batch = writeBatch(targetDb);
  let opCount = 0;
  let totalImported = 0;

  const commitBatchIfNeeded = async (force = false) => {
    if (opCount >= 400 || (force && opCount > 0)) {
      console.log(`  💾 Committing batch write (${opCount} operations)...`);
      await batch.commit();
      totalImported += opCount;
      batch = writeBatch(targetDb);
      opCount = 0;
    }
  };

  // 1. Write Store document
  if (storeDoc && storeDoc.id) {
    console.log(`  📝 Importing Store doc: ${storeDoc.id}`);
    const { id, ...data } = storeDoc;
    batch.set(doc(targetDb, 'stores', id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
    opCount++;
    await commitBatchIfNeeded();
  }

  // 2. Write all collection documents
  for (const [colName, docs] of Object.entries(collections || {})) {
    if (!Array.isArray(docs) || docs.length === 0) continue;
    console.log(`  📥 Importing ${docs.length} records into collection: "${colName}"...`);

    for (const record of docs) {
      const { id, ...data } = record;
      const ref = doc(targetDb, colName, id);
      batch.set(ref, { ...data, storeId, updatedAt: serverTimestamp() }, { merge: true });
      opCount++;
      await commitBatchIfNeeded();
    }
  }

  await commitBatchIfNeeded(true);
  console.log(`\n✅ Migration successful! Total records written: ${totalImported}`);
}

async function main() {
  const { command, options } = parseArgs();

  if (command === 'help' || options.help) {
    console.log(`
NexaStore OS - Firebase Store Migration Utility v2.0

Commands:
  export   Export a store's data from Firebase into a local JSON bundle.
  import   Import a JSON backup bundle into a target Firebase database.
  sync     Stream store data directly from source Firebase to target Firebase.

Options:
  --storeId         The ID of the store to export/migrate (required)
  --sourceConfig    Path to source Firebase config JSON (required for export/sync)
  --targetConfig    Path to target Firebase config JSON (required for import/sync)
  --output          File path to save JSON bundle (default: ./store-<storeId>-export.json)
  --input           File path of JSON bundle to import (required for import)

Examples:
  node firebase-store-migrator.mjs export --storeId="store_123" --sourceConfig="./firebase-source.json"
  node firebase-store-migrator.mjs import --input="./store-store_123-export.json" --targetConfig="./firebase-target.json"
  node firebase-store-migrator.mjs sync --storeId="store_123" --sourceConfig="./source.json" --targetConfig="./target.json"
    `);
    process.exit(0);
  }

  if (command === 'export') {
    if (!options.storeId) throw new Error('Missing required flag: --storeId');
    const sourceConfig = loadFirebaseConfig(options.sourceConfig);
    const sourceApp = initializeApp(sourceConfig, 'sourceApp');
    const sourceDb = getFirestore(sourceApp);

    const payload = await exportStoreData(sourceDb, options.storeId);
    const outputPath = path.resolve(options.output || `./store-${options.storeId}-export.json`);
    fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`\n💾 Saved bundle file to: ${outputPath}\n`);
  } else if (command === 'import') {
    if (!options.input) throw new Error('Missing required flag: --input');
    const inputPath = path.resolve(options.input);
    if (!fs.existsSync(inputPath)) throw new Error(`Input bundle file not found: ${inputPath}`);

    const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    const targetConfig = loadFirebaseConfig(options.targetConfig);
    const targetApp = initializeApp(targetConfig, 'targetApp');
    const targetDb = getFirestore(targetApp);

    await importStoreData(targetDb, payload);
  } else if (command === 'sync') {
    if (!options.storeId) throw new Error('Missing required flag: --storeId');
    const sourceConfig = loadFirebaseConfig(options.sourceConfig);
    const targetConfig = loadFirebaseConfig(options.targetConfig);

    const sourceApp = initializeApp(sourceConfig, 'sourceApp');
    const targetApp = initializeApp(targetConfig, 'targetApp');

    const sourceDb = getFirestore(sourceApp);
    const targetDb = getFirestore(targetApp);

    const payload = await exportStoreData(sourceDb, options.storeId);
    await importStoreData(targetDb, payload);
  } else {
    console.error(`Unknown command: "${command}". Run with --help for usage instructions.`);
  }
}

main().catch((err) => {
  console.error('\n❌ Migration Error:', err.message);
  process.exit(1);
});
