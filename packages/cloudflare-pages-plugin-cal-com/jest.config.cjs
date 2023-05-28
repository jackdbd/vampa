// https://jestjs.io/docs/configuration
const config = {
  errorOnDeprecated: true,
  globals: {},
  moduleFileExtensions: ['js', 'mjs'],
  testEnvironment: 'node',
  testMatch: [`<rootDir>/**/*.test.{js,mjs}`]
}

// console.log('=== Jest config ===', config)

module.exports = config
