import { describe, it, expect } from 'vitest';
import { needsUpdate, assetUrls } from '../src/update';

describe('update check', () => {
  it('offers an update only when the published build differs', () => {
    expect(needsUpdate('abc', 'def')).toBe(true);
    expect(needsUpdate('abc', 'abc')).toBe(false);
    expect(needsUpdate('abc', null)).toBe(false);
    expect(needsUpdate('abc', '')).toBe(false);
  });
  it("doesn't re-offer the build we just restarted into (stale cached page)", () => {
    expect(needsUpdate('old', 'new', 'new')).toBe(false);
    expect(needsUpdate('old', 'newer', 'new')).toBe(true);
  });
  it('finds the script and stylesheet of a built page', () => {
    const html = `<head><script type="module" crossorigin src="./assets/index-Ab12.js"></script>
      <link rel="stylesheet" crossorigin href="./assets/index-Cd34.css"><link rel="icon" href="./x.png"></head>`;
    expect(assetUrls(html)).toEqual(['./assets/index-Ab12.js', './assets/index-Cd34.css']);
  });
});
