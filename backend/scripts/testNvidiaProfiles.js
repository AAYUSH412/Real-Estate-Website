// Uses only a fixed demo prompt. Does not connect to MongoDB or change records.
import dotenv from 'dotenv';
import { pathToFileURL } from 'node:url';
import { MODEL_SEEDS } from '../services/llm/modelProfiles.js';
import { NvidiaNimProvider } from '../services/llm/NvidiaNimProvider.js';
import { APPLICATION_TEST_PROMPT, validateApplicationTest } from '../controller/aiModelController.js';

export async function testNvidiaProfiles(apiKey) {
  if (!apiKey) throw new Error('NVIDIA_API_KEY is required');
  return Promise.all(MODEL_SEEDS.map(async model => {
    const provider = new NvidiaNimProvider(apiKey, [model]);
    const result = { modelId: model.modelId, profile: model.profile, checks: [] };
    for (const mode of ['connection', 'application']) {
      const start = Date.now();
      try {
        let provenance;
        await provider.generateText(mode === 'connection' ? 'Reply OK.' : APPLICATION_TEST_PROMPT, 'Return only the requested final answer. No reasoning or markdown.', {
          exact: true, maxTokens: mode === 'application' ? 1024 : 256, timeoutMs: 30000,
          validate: mode === 'application' ? validateApplicationTest : raw => { if (raw.trim().toUpperCase().replace(/[.!]/g, '') !== 'OK') throw new Error('Connection response did not match'); },
          onResult: value => { provenance = value; },
        });
        result.checks.push({ mode, passed: true, latencyMs: Date.now() - start, effective: provenance.effective, configuration: provenance.configuration });
      } catch (error) { result.checks.push({ mode, passed: false, latencyMs: Date.now() - start, code: error.code || 'OUTPUT_CHECK_FAILED' }); }
    }
    return result;
  }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  dotenv.config({ path: '.env.local', quiet: true }); dotenv.config({ quiet: true });
  try { console.log(JSON.stringify({ testedAt: new Date().toISOString(), results: await testNvidiaProfiles(process.env.NVIDIA_API_KEY) }, null, 2)); }
  catch { console.error('NVIDIA profile checks could not start. Check the server key configuration.'); process.exitCode = 1; }
}
