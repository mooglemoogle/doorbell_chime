import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // Set MOCK_PIIXEL before any module loads so LightStrip runs in mock mode
    env: {
      MOCK_PIIXEL: '1',
    },
  },
})
