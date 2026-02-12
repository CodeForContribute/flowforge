const { createOrganisation } = require('../../src/organisation');
const { expect } = require('chai');

describe('Create Organisation', () => {
  it('should create an organisation successfully', async () => {
    const organisationData = {
      name: 'Test Organisation',
      description: 'This is a test organisation',
      createdBy: 'user123'
    };

    const result = await createOrganisation(organisationData);

    expect(result).to.have.property('id');
    expect(result).to.have.property('name', organisationData.name);
    expect(result).to.have.property('description', organisationData.description);
    expect(result).to.have.property('createdBy', organisationData.createdBy);
  });

  it('should throw an error if the organisation name is missing', async () => {
    const organisationData = {
      description: 'Missing name test',
      createdBy: 'user123'
    };

    try {
      await createOrganisation(organisationData);
    } catch (error) {
      expect(error).to.be.an('error');
      expect(error.message).to.equal('Organisation name is required');
    }
  });

  it('should throw an error if createdBy is not provided', async () => {
    const organisationData = {
      name: 'No Created By Field',
      description: 'This test is missing the createdBy field'
    };

    try {
      await createOrganisation(organisationData);
    } catch (error) {
      expect(error).to.be.an('error');
      expect(error.message).to.equal('Creator information is required');
    }
  });

  // Further tests can be added here for different validation scenarios
});