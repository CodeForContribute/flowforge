const { expect } = require('chai');
const sinon = require('sinon');
const createOrganization = require('../../src/services/organizationService').create;

// Mock database and other dependencies
const dbMock = {
  create: sinon.stub()
};

// Unit test suite for createOrganization function
describe('createOrganization', function() {
  afterEach(() => {
    sinon.restore();
  });

  it('should create a new organization successfully', async function() {
    // Arrange: setup expected result and mock behavior
    const orgData = { name: 'Test Org', description: 'Test Description' };
    const expectedResult = { id: 1, ...orgData };
    dbMock.create.resolves(expectedResult);

    // Stub actual database call within the service
    const createOrgStub = sinon.stub(createOrganization, 'create').resolves(expectedResult);

    // Act: call the function with the test data
    const result = await createOrganization(orgData);

    // Assert: verify the result is as expected
    expect(result).to.deep.equal(expectedResult);
    sinon.assert.calledOnceWithExactly(createOrgStub, orgData);
  });

  it('should throw an error when organization creation fails', async function() {
    // Arrange: setup data and mock behavior
    const orgData = { name: 'Test Org', description: 'Test Description' };
    const expectedError = new Error('Database error');
    dbMock.create.rejects(expectedError);

    // Stub actual database call within the service
    const createOrgStub = sinon.stub(createOrganization, 'create').rejects(expectedError);

    // Act & Assert: expect an error to be thrown
    await expect(createOrganization(orgData)).to.be.rejectedWith('Database error');
    sinon.assert.calledOnceWithExactly(createOrgStub, orgData);
  });
});
