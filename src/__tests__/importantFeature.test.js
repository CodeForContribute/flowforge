import { importantFeature } from '../importantFeature';

test('importantFeature should return correct output when given condition A', () => {
  const input = 'condition A';
  const expectedOutput = 'expected output for condition A';
  expect(importantFeature(input)).toEqual(expectedOutput);
});

test('importantFeature should return correct output when given condition B', () => {
  const input = 'condition B';
  const expectedOutput = 'expected output for condition B';
  expect(importantFeature(input)).toEqual(expectedOutput);
});
