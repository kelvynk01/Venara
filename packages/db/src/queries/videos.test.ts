import { describe, expect, it } from 'vitest';
import { fromAspectEnum, toAspectEnum } from './videos';

describe('aspect enum mapping', () => {
  it('maps API strings to Prisma enums and back', () => {
    for (const aspect of ['16:9', '9:16', '1:1'] as const) {
      expect(fromAspectEnum(toAspectEnum(aspect))).toBe(aspect);
    }
  });

  it('produces the expected Prisma enum identifiers', () => {
    expect(toAspectEnum('16:9')).toBe('RATIO_16_9');
    expect(toAspectEnum('9:16')).toBe('RATIO_9_16');
    expect(toAspectEnum('1:1')).toBe('RATIO_1_1');
  });
});
