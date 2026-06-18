const { createOrganization } = require('../../src/services/organizations');
const { Organization } = require('../../prisma/client');

describe('Organization Creation', () => {
  beforeAll(() => {
    jest.clearAllMocks();
  });

  it('should create an organization with valid data', async () => {
    const mockOrgData = { name: 'New Org', ownerId: 'user-id' };
    const mockCreatedOrg = { id: 'org-id', ...mockOrgData };
    
    Organization.create = jest.fn().mockResolvedValue(mockCreatedOrg);
    const result = await createOrganization(mockOrgData);

    expect(Organization.create).toHaveBeenCalledWith({ data: mockOrgData });
    expect(result).toEqual(mockCreatedOrg);
  });

  it('should throw an error if organization name is missing', async () => {
    const mockOrgData = { ownerId: 'user-id' };

    await expect(createOrganization(mockOrgData)).rejects.toThrow('Organization name is required');
  });

  it('should throw an error if ownerId is missing', async () => {
    const mockOrgData = { name: 'New Org' };

    await expect(createOrganization(mockOrgData)).rejects.toThrow('Owner ID is required');
  });

  it('should handle database errors gracefully', async () => {
    const mockOrgData = { name: 'New Org', ownerId: 'user-id' };
    Organization.create = jest.fn().mockRejectedValue(new Error('Database error'));

    await expect(createOrganization(mockOrgData)).rejects.toThrow('Database error');
  });
});