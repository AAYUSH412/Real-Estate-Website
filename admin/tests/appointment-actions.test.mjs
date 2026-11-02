import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { transformWithEsbuild } from 'vite';
import { getAppointmentActions } from '../src/lib/appointmentActions.js';

// Render the actual JSX component; no browser, provider requests or DOM mocks.
const require = createRequire(import.meta.url);
const source = await readFile(new URL('../src/components/AppointmentActions.jsx', import.meta.url), 'utf8');
let { code } = await transformWithEsbuild(source, 'AppointmentActions.jsx', { jsx: 'automatic', format: 'esm' });
code = code.replace(/from ["'](react\/jsx-runtime|lucide-react)["']/g, (_, name) => `from '${pathToFileURL(require.resolve(name)).href}'`)
  .replace(/from ["']\.\.\/lib\/appointmentActions\.js["']/g, `from '${new URL('../src/lib/appointmentActions.js', import.meta.url).href}'`);
const { default: AppointmentActions } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const now = Date.parse('2026-11-02T10:00:00Z');
const render = (appointment, busy = false) => renderToStaticMarkup(React.createElement(AppointmentActions, { appointment: { _id: 'test', ...appointment }, now, busy, onStatusChange() {} }));
const buttons = html => [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map(([, attributes, content]) => ({ label: content.replace(/<[^>]+>/g, '').trim(), disabled: /(?:^|\s)disabled(?:=|\s|$)/.test(attributes) }));

test('pending appointments show Confirm and Cancel, without Complete', () => {
  assert.deepEqual(buttons(render({ status: 'pending', endsAt: '2026-12-31T06:30:00Z' })), [{ label: 'Confirm', disabled: false }, { label: 'Cancel', disabled: false }]);
});
test('confirmed past appointments show Complete and Cancel, without a redundant Confirm', () => {
  assert.deepEqual(buttons(render({ status: 'confirmed', endsAt: '2026-10-27T05:30:00Z' })), [{ label: 'Complete', disabled: false }, { label: 'Cancel', disabled: false }]);
});
test('confirmed future appointments visibly disable Complete and explain why', () => {
  const html = render({ status: 'confirmed', endsAt: '2026-12-31T06:30:00Z' });
  assert.deepEqual(buttons(html), [{ label: 'Complete', disabled: true }, { label: 'Cancel', disabled: false }]);
  assert.match(html, /Available after the scheduled viewing ends/);
  assert.match(html, /disabled:cursor-not-allowed/);
});
test('missing or invalid end times cannot enable completion', () => {
  for (const endsAt of [undefined, null, '', 'invalid']) {
    assert.equal(buttons(render({ status: 'confirmed', endsAt }))[0].disabled, true);
  }
  assert.equal(getAppointmentActions({ status: 'confirmed', endsAt: new Date(now).toISOString() }, now)[0].disabled, false);
});
test('terminal states have no mutation buttons, and busy rows prevent duplicate clicks', () => {
  for (const status of ['completed', 'cancelled', 'unknown']) assert.deepEqual(buttons(render({ status })), []);
  const html = render({ status: 'confirmed', endsAt: '2026-10-27T05:30:00Z' }, true);
  assert.deepEqual(buttons(html), []); assert.match(html, /Updating appointment/);
});
