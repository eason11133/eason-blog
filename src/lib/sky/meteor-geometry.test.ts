import { describe, expect, it } from 'vitest';
import { firstMeteorCollision, meteorExitDistance } from './meteor-geometry';

describe('meteor geometry', () => {
  it('uses the first heading/tag hit, not DOM order', () => {
    const rects = [
      {left:200, top:200, right:245, bottom:245},
      {left:90, top:90, right:130, bottom:130},
    ];
    expect(firstMeteorCollision({x:20,y:20}, {x:320,y:320}, rects))
      .toBeCloseTo(67/300, 5);
  });
  it('ignores misses and starting inside a label', () => {
    expect(firstMeteorCollision({x:20,y:20}, {x:300,y:250},
      [{left:100, top:350, right:150, bottom:400}])).toBeNull();
    expect(firstMeteorCollision({x:20,y:20}, {x:300,y:250},
      [{left:0, top:0, right:50, bottom:50}])).toBeNull();
  });
  it('keeps flying until the whole tail leaves the screen', () => {
    const left = meteorExitDistance({x:310,y:150}, {x:-.8,y:.6}, 180, 1000, 700);
    expect(310 - .8*left + .8*180).toBeLessThanOrEqual(-25);
    const low = meteorExitDistance({x:780,y:580}, {x:.45,y:.893}, 70, 1000, 700);
    expect(
      780+.45*low-.45*70>=1025 ||
      580+.893*low-.893*70>=725,
    ).toBe(true);
  });
});
