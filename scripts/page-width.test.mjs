import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pageWidthForViewport } from '../ui/src/utils/page-width.ts';

test('fixed canvases switch exactly at the required breakpoints', () => {
  for (const [viewport, expected] of [[320,360],[360,360],[719,360],[720,720],[1079,720],[1080,1080],[1439,1080],[1440,1440],[1920,1440]]) {
    assert.equal(pageWidthForViewport(viewport), expected);
  }
});
test('shrinking and expanding restores each fixed canvas', () => {
  const viewports = [1920,1200,800,500,800,1200,1920,500,1920];
  assert.deepEqual(viewports.map(pageWidthForViewport), [1440,1080,720,360,720,1080,1440,360,1440]);
});
