# MatrixMedys Testing Suite

This comprehensive testing suite provides thorough coverage for the MatrixMedys quality control and warehouse management system. The test suite includes unit tests, integration tests, API validation tests, and performance tests.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Setup Instructions](#setup-instructions)
- [Running Tests](#running-tests)
- [Test Categories](#test-categories)
- [Test Data Management](#test-data-management)
- [Performance Testing](#performance-testing)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The testing suite covers the following key areas:
- **Database Models**: Comprehensive unit tests for all MongoDB models
- **API Routes**: Integration tests for all REST API endpoints
- **Middleware**: Authentication, authorization, and validation middleware tests
- **Performance**: Bulk operations and dashboard query performance tests
- **Data Seeders**: Realistic test data generation for various scenarios

## Test Structure

```
tests/
├── unit/
│   └── models/                 # Database model unit tests
│       ├── QualityControl.test.js
│       ├── WarehouseApproval.test.js
│       ├── Inventory.test.js
│       ├── Notification.test.js
│       └── AuditLog.test.js
├── api/
│   ├── middleware/             # Middleware tests
│   │   └── auth.test.js
│   ├── validation/             # Input validation tests
│   │   └── inputValidation.test.js
│   └── routes/                 # API route tests
│       ├── qcRoutes.test.js
│       ├── warehouseApprovalRoutes.test.js
│       └── inventoryRoutes.test.js
├── performance/                # Performance tests
│   ├── bulkOperations.test.js
│   └── dashboardQueries.test.js
├── seeders/                    # Test data seeders
│   ├── qcTestData.js
│   └── warehouseApprovalTestData.js
└── README.md                   # This documentation
```

## Setup Instructions

### Prerequisites

1. **Node.js** (v16 or higher)
2. **MongoDB** (v5.0 or higher)
3. **npm** or **yarn** package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Install test-specific dependencies:
```bash
npm install --save-dev jest supertest mongodb-memory-server
```

3. Set up environment variables for testing:
```bash
# Create .env.test file
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/matrixmedys_test
JWT_SECRET=your_test_jwt_secret_here
PORT=3001
```

### Database Setup

The tests use MongoDB Memory Server for isolated testing environments. No manual database setup is required as each test suite creates its own temporary database instance.

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Categories
```bash
# Unit tests only
npm run test:unit

# API tests only
npm run test:api

# Performance tests only
npm run test:performance

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Individual Test Files
```bash
# Run specific test file
npx jest tests/unit/models/QualityControl.test.js

# Run tests matching pattern
npx jest --testNamePattern="QualityControl"

# Run tests with verbose output
npx jest --verbose
```

## Test Categories

### 1. Unit Tests (`tests/unit/`)

**Database Model Tests** - Comprehensive validation of MongoDB models:

- **Schema Validation**: Required fields, data types, enum values
- **Default Values**: Automatic field population and timestamps
- **Methods & Virtuals**: Custom model methods and virtual properties
- **Indexing**: Database index functionality and query optimization
- **Business Logic**: Model-specific validation rules and constraints

**Coverage Areas**:
- QualityControl model: QC workflow, product validation, status transitions
- WarehouseApproval model: Approval workflow, storage location validation
- Inventory model: Stock management, quantity tracking, expiry handling
- Notification model: User notifications, delivery tracking, priority handling
- AuditLog model: Activity logging, compliance tracking, security events

### 2. API Tests (`tests/api/`)

**Middleware Tests**:
- Authentication: JWT token validation, user session management
- Authorization: Role-based and permission-based access control
- Input Validation: Request data sanitization and validation

**Route Tests**:
- CRUD Operations: Create, read, update, delete functionality
- Business Logic: Workflow transitions, approval processes
- Error Handling: Graceful error responses and status codes
- Security: Input sanitization, access control validation

### 3. Performance Tests (`tests/performance/`)

**Bulk Operations**:
- Large dataset handling (1000+ records)
- Concurrent operation testing
- Memory usage optimization
- Database query performance

**Dashboard Queries**:
- Real-time dashboard loading performance
- Complex aggregation queries
- Multi-user concurrent access
- Index utilization analysis

## Test Data Management

### Test Data Seeders

The test suite includes comprehensive data seeders that create realistic test scenarios:

**QC Test Data Seeder** (`tests/seeders/qcTestData.js`):
- Multiple QC types and statuses
- Complex product structures
- User role assignments
- Workflow scenario testing

**Warehouse Approval Test Data Seeder** (`tests/seeders/warehouseApprovalTestData.js`):
- Approval workflow scenarios
- Storage location configurations
- Integration with QC records
- Inventory creation workflows

### Using Test Data

```javascript
import { qcTestDataSeeder } from '../seeders/qcTestData.js';

// In your test setup
beforeAll(async () => {
  const testData = await qcTestDataSeeder.seedAll();
  // Use testData.users, testData.products, testData.qcRecords, etc.
});

// Cleanup after tests
afterAll(async () => {
  await qcTestDataSeeder.cleanup();
});
```

### Custom Test Data

Create custom test scenarios:

```javascript
// Create specific test users
const testUsers = await qcTestDataSeeder.createTestUsers([
  { role: 'qc_manager', name: 'Test Manager' },
  { role: 'qc_inspector', name: 'Test Inspector' }
]);

// Create scenario-specific QC records
const qcRecords = await qcTestDataSeeder.createScenarioQCRecords({
  scenario: 'urgent_approval',
  count: 5,
  assignedTo: testUsers[0]._id
});
```

## Performance Testing

### Performance Benchmarks

The performance tests establish benchmarks for:

- **Dashboard Queries**: < 2 seconds for complex aggregations
- **Bulk Operations**: Handle 1000+ records efficiently
- **API Response Times**: < 500ms for standard CRUD operations
- **Memory Usage**: Monitor and prevent memory leaks

### Running Performance Tests

```bash
# Run all performance tests
npm run test:performance

# Run with detailed metrics
npm run test:performance -- --verbose

# Run specific performance test
npx jest tests/performance/dashboardQueries.test.js
```

### Performance Monitoring

Performance tests automatically log metrics:

```javascript
// Example performance output
Dashboard Query "QC Overview Statistics" completed in 1247ms {
  queryName: 'QC Overview Statistics',
  duration: 1247,
  memoryDelta: 2048576,
  resultSize: 1024
}
```

## Best Practices

### Writing Tests

1. **Descriptive Test Names**: Use clear, descriptive test names that explain the expected behavior
2. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and assertion phases
3. **Test Isolation**: Each test should be independent and not rely on other tests
4. **Realistic Data**: Use realistic test data that mirrors production scenarios
5. **Error Testing**: Include tests for error conditions and edge cases

### Test Organization

1. **Group Related Tests**: Use `describe` blocks to group related functionality
2. **Setup and Teardown**: Use `beforeAll`, `beforeEach`, `afterAll`, `afterEach` appropriately
3. **Shared Utilities**: Extract common test utilities to reduce duplication
4. **Clear Assertions**: Use specific assertions that clearly indicate what is being tested

### Performance Considerations

1. **Database Cleanup**: Always clean up test data to prevent interference
2. **Memory Management**: Monitor memory usage in performance tests
3. **Concurrent Testing**: Test concurrent operations to identify race conditions
4. **Index Usage**: Verify that database queries use appropriate indexes

## Troubleshooting

### Common Issues

**MongoDB Connection Issues**:
```bash
# Ensure MongoDB is running
sudo systemctl start mongod

# Check MongoDB status
sudo systemctl status mongod
```

**Test Timeout Issues**:
```javascript
// Increase timeout for slow tests
jest.setTimeout(30000); // 30 seconds
```

**Memory Issues**:
```bash
# Run tests with increased memory
node --max-old-space-size=4096 node_modules/.bin/jest
```

**Port Conflicts**:
```bash
# Use different port for testing
PORT=3001 npm test
```

### Debugging Tests

**Enable Debug Logging**:
```bash
DEBUG=* npm test
```

**Run Single Test with Debug**:
```bash
npx jest --runInBand --detectOpenHandles tests/unit/models/QualityControl.test.js
```

**Database Query Debugging**:
```javascript
// Enable mongoose debugging
mongoose.set('debug', true);
```

### Test Data Issues

**Clean Test Database**:
```javascript
// Manual cleanup if needed
await mongoose.connection.db.dropDatabase();
```

**Reset Test Data**:
```bash
# Re-run seeders
npm run test:seed
```

## Contributing

When adding new tests:

1. Follow the existing test structure and naming conventions
2. Include both positive and negative test cases
3. Add performance considerations for new features
4. Update this documentation for new test categories
5. Ensure all tests pass before submitting changes

## Test Coverage

The test suite aims for comprehensive coverage:

- **Unit Tests**: 90%+ code coverage for models
- **Integration Tests**: All API endpoints covered
- **Performance Tests**: Critical user workflows tested
- **Error Handling**: All error conditions tested

Run coverage reports:
```bash
npm run test:coverage
```

View detailed coverage:
```bash
open coverage/lcov-report/index.html
```

## Continuous Integration

The test suite is designed to run in CI/CD environments:

```yaml
# Example GitHub Actions workflow
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

For questions or issues with the test suite, please refer to the project documentation or contact the development team.