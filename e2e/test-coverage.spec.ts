import { expect, test } from '@playwright/test';
import { execSync } from 'child_process';

// This test ensures that the overall coverage is above 80%
test.describe('Test Coverage', () => {
  test('should be above 80%', async () => {
    // Execute coverage command
    execSync('npx playwright test --coverage');

    // Read the generated coverage report
    const coverageSummary = require('../coverage/playwright/report.json');

    // Check coverage percentages
    const statementsCoverage = coverageSummary.total.statements.pct;
    const branchesCoverage = coverageSummary.total.branches.pct;
    const functionsCoverage = coverageSummary.total.functions.pct;
    const linesCoverage = coverageSummary.total.lines.pct;

    // Expect each of them to be above 80%
    expect(statementsCoverage).toBeGreaterThanOrEqual(80);
    expect(branchesCoverage).toBeGreaterThanOrEqual(80);
    expect(functionsCoverage).toBeGreaterThanOrEqual(80);
    expect(linesCoverage).toBeGreaterThanOrEqual(80);
  });
});