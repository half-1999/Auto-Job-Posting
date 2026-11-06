/** Compile-time flag. When false, the mock modules are never imported and drop out of the build. */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'
