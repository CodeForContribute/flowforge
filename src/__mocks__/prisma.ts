// Mock Prisma client for testing

export const prisma = {
  // User
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },

  // Project
  project: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },

  // Task
  task: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },

  // Execution
  execution: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },

  // Comment
  comment: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },

  // Notification
  notification: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },

  // UserPreferences
  userPreferences: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },

  // Sprint
  sprint: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },

  // ProjectMember
  projectMember: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },

  // Label
  label: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },

  // Transaction support
  $transaction: jest.fn((callback) => callback(prisma)),

  // Disconnect
  $disconnect: jest.fn(),
};

// Reset all mocks
export function resetPrismaMocks() {
  Object.keys(prisma).forEach((model) => {
    if (typeof prisma[model as keyof typeof prisma] === 'object' && prisma[model as keyof typeof prisma] !== null) {
      const modelObj = prisma[model as keyof typeof prisma] as Record<string, jest.Mock>;
      Object.keys(modelObj).forEach((method) => {
        if (typeof modelObj[method]?.mockReset === 'function') {
          modelObj[method].mockReset();
        }
      });
    }
  });
}
