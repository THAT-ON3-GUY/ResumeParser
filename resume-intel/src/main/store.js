import Store from 'electron-store'

const store = new Store(
  process.env.RESUME_INTEL_E2E_USER_DATA
    ? { cwd: process.env.RESUME_INTEL_E2E_USER_DATA }
    : {}
)

export default store
